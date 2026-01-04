import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { toast } from 'react-toastify';
import Loader from '../common/Loader';
import Modal from '../common/Modal';
import FaceVerification from './FaceVerification';

const NIDVerification = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [userConsent, setUserConsent] = useState(false);
  const [quotaError, setQuotaError] = useState(null);
  const [retryCountdown, setRetryCountdown] = useState(null);
  const [showFaceVerification, setShowFaceVerification] = useState(false);
  const [faceVerificationData, setFaceVerificationData] = useState(null);
  const [verificationStep, setVerificationStep] = useState('nid'); // 'nid', 'face', 'submitting'

  const fetchVerificationStatus = async () => {
    try {
      const response = await api.get('/api/verification/nid/status');
      if (response.data.success) {
        setVerificationStatus(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching verification status:', error);
    }
  };

  useEffect(() => {
    // Only fetch verification status for workers
    if (user && user.role === 'worker') {
      fetchVerificationStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Only show NID verification for workers
  if (!user || user.role !== 'worker') {
    return null;
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
    
    // Show consent modal
    setShowConsentModal(true);
  };

  const handleFaceVerificationComplete = (faceData) => {
    setFaceVerificationData(faceData);
    setShowFaceVerification(false);
    setVerificationStep('submitting');
    // Automatically submit after face verification
    handleFinalSubmit();
  };

  const handleFinalSubmit = async () => {
    if (!selectedFile || !userConsent || !faceVerificationData) {
      toast.error('Please complete all verification steps');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('nid_image', selectedFile);
      formData.append('user_consent', 'true');
      formData.append('selfie_image', faceVerificationData.selfieImage);
      formData.append('selfie_descriptor', JSON.stringify(faceVerificationData.selfieDescriptor));
      formData.append('face_matches', JSON.stringify(faceVerificationData.matches));

      const response = await api.post('/api/verification/nid', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        toast.success(response.data.message);
        setSelectedFile(null);
        setPreview(null);
        setUserConsent(false);
        setShowConsentModal(false);
        setFaceVerificationData(null);
        setVerificationStep('nid');
        setQuotaError(null);
        setRetryCountdown(null);
        fetchVerificationStatus();
      }
    } catch (error) {
      // Handle errors (same as before)
      if (error.response?.status === 429 || error.response?.data?.quotaExceeded) {
        const retryAfter = error.response?.data?.retryAfter;
        const suggestion = error.response?.data?.suggestion || 'Please wait and try again later, or upgrade your API key.';
        const isDailyQuota = error.response?.data?.dailyQuotaExceeded;
        
        setQuotaError({
          message: isDailyQuota 
            ? 'Daily API Quota Exceeded' 
            : 'Rate Limit Reached',
          suggestion: suggestion,
          retryAfter: retryAfter
        });
        
        if (retryAfter && retryAfter > 0 && retryAfter < 300) {
          if (window.quotaCountdownInterval) {
            clearInterval(window.quotaCountdownInterval);
          }
          
          setRetryCountdown(retryAfter);
          
          window.quotaCountdownInterval = setInterval(() => {
            setRetryCountdown(prev => {
              if (prev === null || prev <= 1) {
                if (window.quotaCountdownInterval) {
                  clearInterval(window.quotaCountdownInterval);
                  window.quotaCountdownInterval = null;
                }
                return null;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          toast.error(
            <div>
              <p className="font-semibold">{isDailyQuota ? 'Daily Quota Exceeded' : 'Rate Limit Reached'}</p>
              <p className="text-sm mt-1">{suggestion}</p>
            </div>,
            { autoClose: 15000 }
          );
        }
      } else {
        const errorMessage = error.response?.data?.message || 'Failed to submit NID verification';
        const errors = error.response?.data?.errors || [];
        
        if (errors.length > 0) {
          errors.forEach(err => toast.error(err));
        } else {
          toast.error(errorMessage);
        }
      }
      setVerificationStep('nid');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || !userConsent) {
      toast.error('Please provide consent and select an image');
      return;
    }

    // Prevent multiple simultaneous submissions
    if (loading) {
      toast.warning('Please wait, a submission is already in progress...');
      return;
    }

    // CRITICAL: Check if we're in a quota error state with active countdown
    if (quotaError && retryCountdown !== null && retryCountdown > 0) {
      toast.warning(`⏱️ Please wait ${retryCountdown} seconds before retrying. The API quota is currently exceeded.`);
      return;
    }

    if (quotaError && retryCountdown === 0) {
      setQuotaError(null);
      setRetryCountdown(null);
    }

    if (quotaError && retryCountdown === null) {
      toast.error('Daily quota exceeded. Please wait 24 hours or upgrade your API key.');
      return;
    }

    // Close consent modal and proceed to face verification
    setShowConsentModal(false);
    setVerificationStep('face');
    setShowFaceVerification(true);
  };

  const getStatusBadge = (status, reviewedBy) => {
    // If reviewed by admin, show final status
    if (reviewedBy) {
      const badges = {
        'approved': { color: 'bg-green-500', text: 'Approved' },
        'rejected': { color: 'bg-red-500', text: 'Rejected' },
      };
      const badge = badges[status] || { color: 'bg-gray-500', text: status };
      return (
        <span className={`px-3 py-1 rounded-full text-white text-sm font-medium ${badge.color}`}>
          {badge.text}
        </span>
      );
    }
    
    // If not reviewed, show pending
    return (
      <span className="px-3 py-1 rounded-full text-white text-sm font-medium bg-yellow-500">
        Pending
      </span>
    );
  };

  if (!verificationStatus) {
    return <Loader />;
  }

  // Don't show the verification section if already approved by admin
  if (verificationStatus.verification_status === 'approved' && verificationStatus.reviewed_by) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">NID Verification</h2>
          <p className="text-sm text-gray-600 mt-1">Optional - Required to activate account and receive jobs</p>
        </div>
        {getStatusBadge(verificationStatus.verification_status || 'not_submitted')}
      </div>

      {/* Quota Error Display */}
      {quotaError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-red-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-red-800 font-semibold mb-2">{quotaError.message}</p>
              <p className="text-red-700 text-sm mb-3">{quotaError.suggestion}</p>
              
              {retryCountdown !== null && retryCountdown > 0 && (
                <div className="mt-3 p-3 bg-red-100 rounded border border-red-300">
                  <p className="text-red-800 text-sm font-medium mb-1">
                    ⏱️ Please wait before retrying:
                  </p>
                  <p className="text-red-900 text-lg font-bold">
                    {Math.floor(retryCountdown / 60)}:{(retryCountdown % 60).toString().padStart(2, '0')}
                  </p>
                  <p className="text-red-700 text-xs mt-2">
                    ⚠️ Do not submit again until the timer reaches 0:00
                  </p>
                </div>
              )}
              
              {retryCountdown === null && quotaError.retryAfter === null && (
                <div className="mt-3">
                  <p className="text-red-700 text-sm font-medium">
                    <strong>Daily Quota Exceeded</strong>
                  </p>
                  <p className="text-red-700 text-sm mt-1">
                    The quota will reset in 24 hours. Consider upgrading your API key for higher limits.
                  </p>
                </div>
              )}
              
              {retryCountdown === 0 && (
                <div className="mt-3 p-2 bg-green-100 rounded border border-green-300">
                  <p className="text-green-800 text-sm font-medium">
                    ✅ You can now try submitting again
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Show pending message for all unreviewed verifications */}
      {!verificationStatus.reviewed_by && 
        (verificationStatus.verification_status === 'approved' || 
         verificationStatus.verification_status === 'auto_rejected' || 
         verificationStatus.verification_status === 'pending') && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-yellow-800">
              Your request is pending. We'll notify you once it's processed.
            </p>
          </div>
        </div>
      )}

      {/* Show approved message only when admin has reviewed */}
      {verificationStatus.verification_status === 'approved' && verificationStatus.reviewed_by && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-green-800 font-medium">
              Your NID verification has been approved. You have access to all verified features.
            </p>
          </div>
        </div>
      )}

      {/* Show rejected message only when admin has reviewed */}
      {verificationStatus.verification_status === 'rejected' && verificationStatus.reviewed_by && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-red-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-red-800 font-semibold mb-2">Verification Rejected</p>
              {verificationStatus.rejection_reason ? (
                <div className="space-y-2">
                  <div className="bg-red-100 border border-red-300 rounded p-3">
                    <p className="text-red-900 font-medium text-sm mb-1">Rejection Reason:</p>
                    <p className="text-red-800 text-sm leading-relaxed">{verificationStatus.rejection_reason}</p>
                  </div>
                  <p className="text-red-700 text-sm mt-2">You can resubmit with a new NID image.</p>
                </div>
              ) : (
                <div>
                  <p className="text-red-700 text-sm">Provide Valid NID and Information</p>
                  <p className="text-red-700 text-sm mt-2">You can resubmit with a new NID image.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {(verificationStatus.verification_status === 'not_submitted' || 
        verificationStatus.verification_status === 'rejected' || 
        verificationStatus.verification_status === 'auto_rejected') && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload NID Image
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-blue-400 transition">
              <div className="space-y-1 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="flex text-sm text-gray-600">
                  <label htmlFor="nid-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                    <span>Upload a file</span>
                    <input
                      id="nid-upload"
                      name="nid-upload"
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleFileSelect}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, JPEG up to 5MB</p>
              </div>
            </div>
          </div>

          {preview && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
              <img
                src={preview}
                alt="NID preview"
                className="max-w-md h-auto border border-gray-300 rounded-lg"
              />
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Requirements:</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Clear, well-lit image of your Bangladesh National ID</li>
              <li>All text should be clearly visible and readable</li>
              <li>No editing, filters, or tampering</li>
              <li>Image should be in focus and not blurry</li>
              <li>Must be at least 18 years old</li>
            </ul>
          </div>
        </div>
      )}

      {/* Face Verification Modal */}
      <Modal
        isOpen={showFaceVerification}
        onClose={() => {
          setShowFaceVerification(false);
          setVerificationStep('nid');
        }}
        title="Face Verification - Live Selfie"
        size="large"
      >
        <FaceVerification
          onFaceCaptured={handleFaceVerificationComplete}
          onClose={() => {
            setShowFaceVerification(false);
            setVerificationStep('nid');
          }}
          profilePhoto={user?.profile_photo}
          nidPhoto={preview}
        />
      </Modal>

      {/* Consent Modal */}
      <Modal
        isOpen={showConsentModal}
        onClose={() => {
          setShowConsentModal(false);
          setUserConsent(false);
        }}
        title="NID Verification Consent"
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> By proceeding, you consent to:
            </p>
            <ul className="text-sm text-yellow-800 mt-2 space-y-1 list-disc list-inside">
              <li>Processing your NID image using OCR for data extraction</li>
              <li>Face verification using live selfie capture</li>
              <li>Three-way face matching (NID photo vs Selfie vs Profile photo)</li>
              <li>Temporary storage of your images for verification purposes</li>
              <li>Automatic deletion of your images after processing</li>
              <li>Storage of extracted data for verification and security purposes</li>
            </ul>
          </div>

          <div className="flex items-start">
            <input
              type="checkbox"
              id="consent"
              checked={userConsent}
              onChange={(e) => setUserConsent(e.target.checked)}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="consent" className="ml-2 text-sm text-gray-700">
              I understand and consent to the processing of my NID information as described above.
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => {
                setShowConsentModal(false);
                setUserConsent(false);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!userConsent || loading || (quotaError && retryCountdown !== null && retryCountdown > 0)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 
               (quotaError && retryCountdown !== null && retryCountdown > 0) 
                 ? `Wait ${retryCountdown}s` 
                 : 'Submit for Verification'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default NIDVerification;

