import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from '@vladmandic/face-api';
import { toast } from 'react-toastify';
import Loader from '../common/Loader';

// Helper to safely detect faces with error handling
const safeDetectFaces = async (input, options) => {
  try {
    const detections = await faceapi
      .detectAllFaces(input, options)
      .withFaceLandmarks()
      .withFaceDescriptors();
    
    // Validate all detections have valid bounding boxes
    return detections.filter(detection => {
      try {
        const box = detection.detection?.box;
        if (!box) return false;
        
        return typeof box.x === 'number' && !isNaN(box.x) && isFinite(box.x) &&
               typeof box.y === 'number' && !isNaN(box.y) && isFinite(box.y) &&
               typeof box.width === 'number' && !isNaN(box.width) && isFinite(box.width) && box.width > 0 &&
               typeof box.height === 'number' && !isNaN(box.height) && isFinite(box.height) && box.height > 0;
      } catch (e) {
        return false;
      }
    });
  } catch (error) {
    // Return empty array on any error to prevent crashes
    return [];
  }
};

// Detect if running on mobile device
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Face matching configuration (Real-world app standards like Tinder/Bumble)
// These apps use lenient thresholds to prevent false rejections while still catching obvious mismatches
const FACE_MATCH_DISTANCE_THRESHOLD = 0.65; // Maximum Euclidean distance for profile photo match
const NID_MATCH_DISTANCE_THRESHOLD = 0.75; // Maximum Euclidean distance for NID photo match (more lenient - NID pics are usually less clear than profile photos)
const MIN_FACE_MATCH_CONFIDENCE = 15; // Minimum confidence percentage (lowered to 15% - real apps focus on distance, not strict confidence)

const FaceVerification = ({ onFaceCaptured, onClose, profilePhoto, nidPhoto }) => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const detectingRef = useRef(false); // Lock to prevent concurrent detections
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [selfieImage, setSelfieImage] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [matchResults, setMatchResults] = useState(null);
  const [selfieDescriptor, setSelfieDescriptor] = useState(null);

  // Set up global error handler for face-api errors
  useEffect(() => {
    const handleError = (event) => {
      // Suppress face-api box constructor errors
      if (event.error && event.error.message && 
          event.error.message.includes('Box.constructor') &&
          event.error.message.includes('expected box to be')) {
        event.preventDefault();
        event.stopPropagation();
        console.warn('Face detection error suppressed:', event.error.message);
        return false;
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && event.reason.message && 
          event.reason.message.includes('Box.constructor')) {
        event.preventDefault();
        console.warn('Face detection promise rejection suppressed:', event.reason.message);
      }
    });

    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  // Load face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoading(true);
        const MODEL_URL = '/models';
        
        console.log('Loading face-api models from:', MODEL_URL);
        
        // Test if models directory is accessible
        try {
          const testResponse = await fetch(`${MODEL_URL}/tiny_face_detector_model-weights_manifest.json`);
          if (!testResponse.ok) {
            throw new Error(`Cannot access models directory. Status: ${testResponse.status}`);
          }
          console.log('✅ Models directory is accessible');
        } catch (fetchError) {
          console.error('❌ Cannot access models directory:', fetchError);
          toast.error(`Cannot access models: ${fetchError.message}. Please restart the development server.`);
          setLoading(false);
          return;
        }
        
        // Load models one by one with better error handling
        try {
          console.log('Loading tinyFaceDetector...');
          await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
          console.log('✅ tinyFaceDetector loaded');
        } catch (err) {
          console.error('❌ Failed to load tinyFaceDetector:', err);
          throw new Error(`Failed to load tinyFaceDetector: ${err.message}`);
        }
        
        try {
          console.log('Loading faceLandmark68Net...');
          await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
          console.log('✅ faceLandmark68Net loaded');
        } catch (err) {
          console.error('❌ Failed to load faceLandmark68Net:', err);
          throw new Error(`Failed to load faceLandmark68Net: ${err.message}`);
        }
        
        try {
          console.log('Loading faceRecognitionNet...');
          await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
          console.log('✅ faceRecognitionNet loaded');
        } catch (err) {
          console.error('❌ Failed to load faceRecognitionNet:', err);
          throw new Error(`Failed to load faceRecognitionNet: ${err.message}`);
        }
        
        setModelsLoaded(true);
        setLoading(false);
        console.log('✅ All face-api models loaded successfully');
        toast.success('Face recognition models loaded successfully!');
      } catch (error) {
        console.error('❌ Error loading face-api models:', error);
        const errorMessage = error.message || 'Unknown error';
        toast.error(`Failed to load face recognition models: ${errorMessage}. Please refresh the page or restart the development server.`);
        setLoading(false);
      }
    };

    loadModels();
  }, []);

  // Detect face in webcam stream
  const detectFace = useCallback(async () => {
    if (!webcamRef.current || !modelsLoaded || !canvasRef.current) return;
    
    // Prevent concurrent detections
    if (detectingRef.current) return;
    detectingRef.current = true;

    const video = webcamRef.current.video;
    if (!video || video.readyState !== 4) {
      detectingRef.current = false;
      return;
    }

    // Validate video dimensions before proceeding
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    
    // Check if video has valid dimensions (must be > 0)
    if (!videoWidth || !videoHeight || videoWidth <= 0 || videoHeight <= 0 || 
        isNaN(videoWidth) || isNaN(videoHeight)) {
      detectingRef.current = false;
      return; // Video not ready yet, skip this detection cycle
    }

    const canvas = canvasRef.current;
    const displaySize = { width: videoWidth, height: videoHeight };
    
    // Ensure canvas has valid dimensions
    if (!canvas.width || !canvas.height) {
      canvas.width = videoWidth;
      canvas.height = videoHeight;
    }
    
    try {
      // Wrap everything in try-catch to prevent crashes
      faceapi.matchDimensions(canvas, displaySize);

      // Detect faces with comprehensive error handling
      let detections = [];
      try {
        // Use more lenient detection options to prevent errors
        const detectionOptions = new faceapi.TinyFaceDetectorOptions({
          inputSize: 320, // Smaller input size for better performance
          scoreThreshold: 0.3 // Lower threshold to catch more faces
        });
        
        // Use safe detection wrapper
        detections = await safeDetectFaces(video, detectionOptions);
      } catch (detectionError) {
        // If detection fails, just skip this cycle silently
        detectingRef.current = false;
        return;
      }

      // Validate detections array
      if (!Array.isArray(detections)) {
        detectingRef.current = false;
        return;
      }

      // Filter out invalid detections (with null bounding boxes)
      const validDetections = detections.filter(detection => {
        try {
          if (!detection || !detection.detection) return false;
          
          const box = detection.detection.box;
          if (!box) return false;
          
          // Strict validation - all must be valid numbers
          const hasValidBox = 
            typeof box.x === 'number' && !isNaN(box.x) && isFinite(box.x) &&
            typeof box.y === 'number' && !isNaN(box.y) && isFinite(box.y) &&
            typeof box.width === 'number' && !isNaN(box.width) && isFinite(box.width) && box.width > 0 &&
            typeof box.height === 'number' && !isNaN(box.height) && isFinite(box.height) && box.height > 0;
          
          return hasValidBox;
        } catch (e) {
          return false;
        }
      });

      // Only resize if we have valid detections and display size
      if (validDetections.length > 0 && displaySize.width > 0 && displaySize.height > 0) {
        try {
          // Double-check display size is valid
          if (isNaN(displaySize.width) || isNaN(displaySize.height) || 
              displaySize.width <= 0 || displaySize.height <= 0) {
            detectingRef.current = false;
            return;
          }

          const resizedDetections = faceapi.resizeResults(validDetections, displaySize);
          
          // Clear canvas
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Draw detections
          faceapi.draw.drawDetections(canvas, resizedDetections);
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

          setFaceDetected(true);
        } catch (resizeError) {
          // Silently handle resize errors to prevent console spam
          // Clear canvas on error
          try {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          } catch (e) {
            // Ignore canvas errors
          }
          setFaceDetected(false);
        }
      } else {
        // Clear canvas if no detections
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setFaceDetected(false);
      }
    } catch (error) {
      // Silently handle all errors to prevent crashes
      // Clear canvas on error
      try {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      } catch (e) {
        // Ignore canvas errors
      }
      setFaceDetected(false);
    } finally {
      // Always release the lock
      detectingRef.current = false;
    }
  }, [modelsLoaded]);

  // Start face detection loop
  useEffect(() => {
    if (!modelsLoaded || capturing) return;

    const interval = setInterval(() => {
      detectFace();
    }, 100); // Check every 100ms

    return () => clearInterval(interval);
  }, [modelsLoaded, detectFace, capturing]);

  // Capture selfie
  const captureSelfie = useCallback(async () => {
    if (!webcamRef.current || !modelsLoaded) {
      toast.error('Camera not ready. Please wait...');
      return;
    }

    setCapturing(true);
    setProcessing(true);

    try {
      const imageSrc = webcamRef.current.getScreenshot();
      
      // Verify face is in the image
      const img = new Image();
      img.src = imageSrc;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Validate image dimensions
      if (!img.width || !img.height || img.width <= 0 || img.height <= 0) {
        throw new Error('Invalid image dimensions');
      }

      let detections = [];
      try {
        const detectionOptions = new faceapi.TinyFaceDetectorOptions({
          inputSize: 320,
          scoreThreshold: 0.3
        });
        
        detections = await Promise.race([
          faceapi
            .detectAllFaces(img, detectionOptions)
            .withFaceLandmarks()
            .withFaceDescriptors(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Detection timeout')), 10000)
          )
        ]);
      } catch (detectionError) {
        console.error('Face detection error on selfie:', detectionError);
        throw new Error('Failed to detect face in image');
      }

      // Filter out invalid detections (with null bounding boxes)
      const validDetections = detections.filter(detection => {
        try {
          const box = detection.detection?.box;
          if (!box) return false;
          
          // Check all required properties with strict validation
          const hasValidBox = 
            typeof box.x === 'number' && !isNaN(box.x) &&
            typeof box.y === 'number' && !isNaN(box.y) &&
            typeof box.width === 'number' && !isNaN(box.width) && box.width > 0 &&
            typeof box.height === 'number' && !isNaN(box.height) && box.height > 0;
          
          return hasValidBox;
        } catch (e) {
          return false;
        }
      });

      if (validDetections.length === 0) {
        toast.error('No face detected. Please ensure your face is clearly visible.');
        setCapturing(false);
        setProcessing(false);
        return;
      }

      if (validDetections.length > 1) {
        toast.warning('Multiple faces detected. Please ensure only your face is visible.');
        setCapturing(false);
        setProcessing(false);
        return;
      }

      // Extract face descriptor
      const descriptor = validDetections[0].descriptor;
      setSelfieImage(imageSrc);
      setSelfieDescriptor(descriptor);
      
      // Process all three images for matching (informational only - won't block submission)
      await processFaceMatching(imageSrc, descriptor);
      
    } catch (error) {
      console.error('Error capturing selfie:', error);
      toast.error('Failed to capture selfie. Please try again.');
      setCapturing(false);
      setProcessing(false);
    }
  }, [modelsLoaded, profilePhoto, nidPhoto]);

  // Process face matching between all three images
  const processFaceMatching = async (selfieImageSrc, selfieDescriptor) => {
    try {
      const results = {
        selfieDescriptor,
        matches: {}
      };

      // Match with profile photo
      if (profilePhoto) {
        try {
          const profileImg = new Image();
          profileImg.crossOrigin = 'anonymous';
          profileImg.src = profilePhoto;
          
          await new Promise((resolve, reject) => {
            profileImg.onload = resolve;
            profileImg.onerror = reject;
          });

          // Validate image dimensions
          if (!profileImg.width || !profileImg.height || profileImg.width <= 0 || profileImg.height <= 0) {
            throw new Error('Invalid profile image dimensions');
          }

          let profileDetections = [];
          try {
            const detectionOptions = new faceapi.TinyFaceDetectorOptions({
              inputSize: 320,
              scoreThreshold: 0.3
            });
            
            profileDetections = await Promise.race([
              faceapi
                .detectAllFaces(profileImg, detectionOptions)
                .withFaceLandmarks()
                .withFaceDescriptors(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Detection timeout')), 10000)
              )
            ]);
          } catch (detectionError) {
            console.error('Face detection error on profile:', detectionError);
            throw new Error('Failed to detect face in profile image');
          }

          // Filter out invalid detections
          const validProfileDetections = profileDetections.filter(detection => {
            try {
              const box = detection.detection?.box;
              if (!box) return false;
              
              const hasValidBox = 
                typeof box.x === 'number' && !isNaN(box.x) &&
                typeof box.y === 'number' && !isNaN(box.y) &&
                typeof box.width === 'number' && !isNaN(box.width) && box.width > 0 &&
                typeof box.height === 'number' && !isNaN(box.height) && box.height > 0;
              
              return hasValidBox;
            } catch (e) {
              return false;
            }
          });

          if (validProfileDetections.length > 0) {
            const profileDescriptor = validProfileDetections[0].descriptor;
            const distance = faceapi.euclideanDistance(selfieDescriptor, profileDescriptor);
            const confidence = Math.max(0, Math.min(100, Math.round((1 - distance / FACE_MATCH_DISTANCE_THRESHOLD) * 100)));
            // Real-world app logic: Primary check is distance, confidence is secondary (prevents only extremely low matches)
            // This matches Tinder/Bumble approach - lenient but still catches obvious mismatches
            const matched = distance < FACE_MATCH_DISTANCE_THRESHOLD && (confidence >= MIN_FACE_MATCH_CONFIDENCE || distance < 0.5);
            results.matches.profile = {
              matched: matched,
              distance: distance,
              confidence: confidence
            };
            console.log('[Face Verification] Profile match:', { 
              distance, 
              matched, 
              confidence,
              distanceThreshold: FACE_MATCH_DISTANCE_THRESHOLD,
              minConfidence: MIN_FACE_MATCH_CONFIDENCE,
              passed: matched ? '✅' : '❌'
            });
          } else {
            results.matches.profile = { matched: false, error: 'No face found in profile photo' };
            console.warn('[Face Verification] No face found in profile photo');
          }
        } catch (error) {
          console.error('Error matching with profile photo:', error);
          results.matches.profile = { matched: false, error: error.message };
        }
      }

      // Match with NID photo
      if (nidPhoto) {
        try {
          const nidImg = new Image();
          nidImg.crossOrigin = 'anonymous';
          nidImg.src = nidPhoto;
          
          await new Promise((resolve, reject) => {
            nidImg.onload = resolve;
            nidImg.onerror = reject;
          });

          // Validate image dimensions
          if (!nidImg.width || !nidImg.height || nidImg.width <= 0 || nidImg.height <= 0) {
            throw new Error('Invalid NID image dimensions');
          }

          let nidDetections = [];
          try {
            const detectionOptions = new faceapi.TinyFaceDetectorOptions({
              inputSize: 320,
              scoreThreshold: 0.3
            });
            
            nidDetections = await Promise.race([
              faceapi
                .detectAllFaces(nidImg, detectionOptions)
                .withFaceLandmarks()
                .withFaceDescriptors(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Detection timeout')), 10000)
              )
            ]);
          } catch (detectionError) {
            console.error('Face detection error on NID:', detectionError);
            throw new Error('Failed to detect face in NID image');
          }

          // Filter out invalid detections
          const validNidDetections = nidDetections.filter(detection => {
            try {
              const box = detection.detection?.box;
              if (!box) return false;
              
              const hasValidBox = 
                typeof box.x === 'number' && !isNaN(box.x) &&
                typeof box.y === 'number' && !isNaN(box.y) &&
                typeof box.width === 'number' && !isNaN(box.width) && box.width > 0 &&
                typeof box.height === 'number' && !isNaN(box.height) && box.height > 0;
              
              return hasValidBox;
            } catch (e) {
              return false;
            }
          });

          if (validNidDetections.length > 0) {
            const nidDescriptor = validNidDetections[0].descriptor;
            const distance = faceapi.euclideanDistance(selfieDescriptor, nidDescriptor);
            // NID uses more lenient threshold - NID photos are usually less clear than profile photos
            const confidence = Math.max(0, Math.min(100, Math.round((1 - distance / NID_MATCH_DISTANCE_THRESHOLD) * 100)));
            // NID matching is more lenient - accepts lower quality matches since NID pics are often blurry/less clear
            const matched = distance < NID_MATCH_DISTANCE_THRESHOLD && (confidence >= MIN_FACE_MATCH_CONFIDENCE || distance < 0.6);
            results.matches.nid = {
              matched: matched,
              distance: distance,
              confidence: confidence
            };
            console.log('[Face Verification] NID match:', { 
              distance, 
              matched, 
              confidence,
              distanceThreshold: NID_MATCH_DISTANCE_THRESHOLD,
              minConfidence: MIN_FACE_MATCH_CONFIDENCE,
              passed: matched ? '✅' : '❌',
              note: 'NID uses more lenient threshold (0.75) than profile (0.65) - NID pics are usually less clear'
            });
          } else {
            results.matches.nid = { matched: false, error: 'No face found in NID photo' };
            console.warn('[Face Verification] No face found in NID photo');
          }
        } catch (error) {
          console.error('Error matching with NID photo:', error);
          results.matches.nid = { matched: false, error: error.message };
        }
      }

      // Store match results (informational only - all submissions go to admin)
      const profilePassed = results.matches.profile?.matched === true;
      const nidPassed = results.matches.nid?.matched === true;
      const allMatched = profilePassed && nidPassed;
      
      // Store results for display
      setMatchResults({
        profile: results.matches.profile,
        nid: results.matches.nid,
        allMatched: allMatched
      });
      
      // Show informational message (not blocking)
      if (allMatched) {
        toast.info('Face matching completed. Review your photo and click Confirm to submit.');
        console.log('[Face Verification] ✅ All three images matched successfully:', {
          profileDistance: results.matches.profile?.distance,
          nidDistance: results.matches.nid?.distance
        });
      } else {
        const failedMatches = [];
        if (results.matches.profile && !profilePassed) failedMatches.push('Profile Photo');
        if (results.matches.nid && !nidPassed) failedMatches.push('NID Photo');
        toast.info(`Face matching completed. ${failedMatches.length > 0 ? failedMatches.join(' and ') + ' did not match. ' : ''}You can still submit for admin review.`);
        console.log('[Face Verification] ⚠️ Face matching results (will still be submitted):', {
          profilePassed,
          nidPassed,
          profileDistance: results.matches.profile?.distance,
          nidDistance: results.matches.nid?.distance
        });
      }

      setProcessing(false);
      setCapturing(false);
      setAwaitingConfirmation(true); // Show confirmation buttons
    } catch (error) {
      console.error('Error processing face matching:', error);
      toast.error('Failed to process face matching. Please try again.');
      setProcessing(false);
      setCapturing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Loader />
        <p className="mt-4 text-gray-600">Loading face recognition models...</p>
      </div>
    );
  }

  if (!modelsLoaded) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Failed to load face recognition models. Please refresh the page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Face Verification Instructions</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Position yourself in good lighting</li>
          <li>Look directly at the camera</li>
          <li>Ensure your face is clearly visible</li>
          <li>Remove glasses or hat if possible</li>
          <li>Hold your device steady (for mobile)</li>
          <li>Wait for the green box to appear around your face</li>
        </ul>
      </div>

      <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9', minHeight: '300px' }}>
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            width: isMobile ? { ideal: 640, min: 320 } : { ideal: 1280, min: 640 },
            height: isMobile ? { ideal: 480, min: 240 } : { ideal: 720, min: 480 },
            facingMode: 'user', // Front camera on mobile, webcam on laptop
            aspectRatio: { ideal: 16/9 }
          }}
          className="w-full h-full object-cover"
          mirrored={true} // Mirror the video for better UX
          screenshotQuality={0.92}
          onUserMedia={(stream) => {
            console.log('✅ Camera access granted');
            // Get video track to check if it's working
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
              console.log('Camera settings:', {
                label: videoTrack.label,
                facingMode: videoTrack.getSettings().facingMode,
                width: videoTrack.getSettings().width,
                height: videoTrack.getSettings().height
              });
            }
          }}
          onUserMediaError={(error) => {
            console.error('❌ Camera access error:', error);
            let errorMessage = 'Failed to access camera. ';
            if (error.name === 'NotAllowedError') {
              errorMessage += 'Please allow camera permissions and refresh the page.';
            } else if (error.name === 'NotFoundError') {
              errorMessage += 'No camera found. Please connect a camera and try again.';
            } else if (error.name === 'NotReadableError') {
              errorMessage += 'Camera is being used by another application.';
            } else {
              errorMessage += error.message || 'Please check your camera settings.';
            }
            toast.error(errorMessage);
          }}
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ objectFit: 'cover' }}
        />
        
        {faceDetected && (
          <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium z-10">
            ✓ Face Detected
          </div>
        )}
        
        {!faceDetected && !loading && (
          <div className="absolute top-4 left-4 bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-medium z-10">
            ⚠️ Position your face in view
          </div>
        )}
      </div>

      {selfieImage && awaitingConfirmation && (
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Captured Selfie:</p>
            <img src={selfieImage} alt="Captured selfie" className="w-full max-w-md rounded-lg border border-gray-300" />
          </div>
          
          {/* Match Results Display (Informational) */}
          {matchResults && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm font-semibold text-gray-700 mb-2">Face Matching Results:</p>
              <div className="space-y-2 text-sm">
                {matchResults.profile && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Profile Photo:</span>
                    <span className={`font-medium ${matchResults.profile.matched ? 'text-green-600' : 'text-orange-600'}`}>
                      {matchResults.profile.matched ? '✅ Matched' : '⚠️ Not Matched'}
                      {matchResults.profile.confidence !== undefined && (
                        <span className="ml-2">({matchResults.profile.confidence}%)</span>
                      )}
                    </span>
                  </div>
                )}
                {matchResults.nid && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">NID Photo:</span>
                    <span className={`font-medium ${matchResults.nid.matched ? 'text-green-600' : 'text-orange-600'}`}>
                      {matchResults.nid.matched ? '✅ Matched' : '⚠️ Not Matched'}
                      {matchResults.nid.confidence !== undefined && (
                        <span className="ml-2">({matchResults.nid.confidence}%)</span>
                      )}
                    </span>
                  </div>
                )}
                <div className="mt-2 pt-2 border-t border-gray-300">
                  <p className="text-xs text-gray-500">
                    {matchResults.allMatched 
                      ? 'All images matched. This will be auto-approved if other criteria are met.'
                      : 'Some images did not match. This will be reviewed by admin.'}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Confirmation Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                setSelfieImage(null);
                setMatchResults(null);
                setSelfieDescriptor(null);
                setAwaitingConfirmation(false);
                setCapturing(false);
              }}
              className="flex-1 bg-gray-200 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-300 font-medium text-base"
            >
              Retake Photo
            </button>
            <button
              onClick={() => {
                if (onFaceCaptured && selfieDescriptor) {
                  onFaceCaptured({
                    selfieImage: selfieImage,
                    selfieDescriptor: Array.from(selfieDescriptor), // Convert Float32Array to regular array
                    matches: matchResults ? {
                      profile: matchResults.profile,
                      nid: matchResults.nid
                    } : {}
                  });
                }
              }}
              className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 font-medium text-base"
            >
              Confirm & Submit
            </button>
          </div>
        </div>
      )}

      {!awaitingConfirmation && (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={captureSelfie}
            disabled={!faceDetected || capturing || processing}
            className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-base"
          >
            {processing ? 'Processing...' : capturing ? 'Capturing...' : 'Capture Selfie'}
          </button>
          <button
            onClick={onClose}
            disabled={processing}
            className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-base"
          >
            Cancel
          </button>
        </div>
      )}

      {processing && (
        <div className="text-center text-sm text-gray-600">
          <p>Matching faces across all images...</p>
        </div>
      )}
    </div>
  );
};

export default FaceVerification;

