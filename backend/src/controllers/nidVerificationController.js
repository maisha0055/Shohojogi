const { query, transaction } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const { extractNIDData, calculateAge, calculateNameSimilarity } = require('../services/ocrService');
const { deleteImage } = require('../config/cloudinary');
const { encrypt, hashNID } = require('../utils/encryption');
const { sendVerificationApprovedEmail } = require('../services/emailService');
const { performThreeWayMatch, isValidDescriptor } = require('../services/faceMatchingService');

// Configuration
const MIN_EXTRACTION_CONFIDENCE = 60; // Minimum confidence threshold
const AUTO_APPROVE_CONFIDENCE = 85; // Auto-approve if confidence >= 85%
const MIN_NAME_SIMILARITY = 0.7; // Minimum name similarity for matching (70%)
const AUTO_APPROVE_NAME_SIMILARITY = 0.85; // Auto-approve if name similarity >= 85%
const MIN_AGE = 18; // Minimum age requirement

// Face matching configuration (must match frontend - Real-world app standards like Tinder/Bumble)
const FACE_MATCH_DISTANCE_THRESHOLD = 0.65; // Maximum Euclidean distance for a match (increased for more leniency)
const MIN_FACE_MATCH_CONFIDENCE = 15; // Minimum confidence percentage (lowered - real apps focus on distance, not strict confidence)

/**
 * Validate extracted NID data
 */
const validateExtractedData = (extractedData) => {
  const errors = [];
  
  // Check extraction confidence
  if (extractedData.extraction_confidence < MIN_EXTRACTION_CONFIDENCE) {
    errors.push(`Extraction confidence (${extractedData.extraction_confidence}%) is below minimum threshold (${MIN_EXTRACTION_CONFIDENCE}%)`);
  }
  
  // Check for tampering
  if (extractedData.tampering_suspected) {
    errors.push('Image tampering detected. Please submit an original, unedited NID image.');
  }
  
  // Check required fields
  if (!extractedData.full_name) {
    errors.push('Full name could not be extracted from the NID image.');
  }
  
  if (!extractedData.nid_number) {
    errors.push('NID number could not be extracted from the image.');
  }
  
  // Validate age if date of birth is available
  if (extractedData.date_of_birth) {
    const age = calculateAge(extractedData.date_of_birth);
    if (age !== null && age < MIN_AGE) {
      errors.push(`Age verification failed. You must be at least ${MIN_AGE} years old.`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Check if NID number is already used by another account
 */
const checkNIDUniqueness = async (nidNumber, currentUserId) => {
  const nidHash = hashNID(nidNumber);
  
  // Check in nid_verifications table (approved verifications)
  const result = await query(
    `SELECT user_id, verification_status 
     FROM nid_verifications 
     WHERE extracted_data->>'nid_number' = $1 
     AND verification_status = 'approved'
     AND user_id != $2`,
    [nidNumber, currentUserId]
  );
  
  if (result.rows.length > 0) {
    return {
      isUnique: false,
      message: 'This NID number is already associated with another account.'
    };
  }
  
  // Also check in users table (encrypted NID numbers)
  const userResult = await query(
    `SELECT id FROM users 
     WHERE nid_number_encrypted IS NOT NULL 
     AND id != $1`,
    [currentUserId]
  );
  
  // Note: In production, you'd decrypt and compare, but for now we'll rely on the verification table
  
  return {
    isUnique: true
  };
};

// @desc    Submit NID for verification
// @route   POST /api/verification/nid
// @access  Private
const submitNIDVerification = asyncHandler(async (req, res) => {
  const { user_consent } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;
  
  // Only workers can submit NID verification
  if (userRole !== 'worker') {
    return res.status(403).json({
      success: false,
      message: 'NID verification is only available for workers'
    });
  }
  
  // Check user consent
  if (!user_consent) {
    return res.status(400).json({
      success: false,
      message: 'User consent is required to process NID verification'
    });
  }
  
  // Check if user already has a pending, auto_rejected, or approved verification (not yet reviewed by admin)
  const existingCheck = await query(
    `SELECT id, verification_status 
     FROM nid_verifications 
     WHERE user_id = $1 
     AND verification_status IN ('pending', 'approved', 'auto_rejected')
     AND reviewed_by IS NULL
     ORDER BY submitted_at DESC
     LIMIT 1`,
    [userId]
  );
  
  if (existingCheck.rows.length > 0) {
    const existing = existingCheck.rows[0];
    if (existing.verification_status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'You already have an approved NID verification awaiting admin review.'
      });
    }
    if (existing.verification_status === 'pending' || existing.verification_status === 'auto_rejected') {
      return res.status(400).json({
        success: false,
        message: 'You already have a verification request under review. Please wait for admin approval.'
      });
    }
  }
  
  // Get images from request
  let nidImageUrl = req.cloudinaryUrl || req.body.nid_image_url;
  const cloudinaryPublicId = req.cloudinaryPublicId;
  
  // Get selfie image (from face verification) - it comes as base64 data URL
  let selfieImageUrl = req.body.selfie_image || null;
  
  console.log('[NID Verification] Received selfie image:', {
    hasSelfieImage: !!selfieImageUrl,
    isBase64: selfieImageUrl?.startsWith('data:image'),
    length: selfieImageUrl?.length
  });
  
  // If selfie is base64, try to upload to Cloudinary if configured
  if (selfieImageUrl && selfieImageUrl.startsWith('data:image')) {
    try {
      const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && 
                                     process.env.CLOUDINARY_API_KEY && 
                                     process.env.CLOUDINARY_API_SECRET;
      
      if (isCloudinaryConfigured) {
        const { uploadImage } = require('../config/cloudinary');
        // Convert base64 to buffer
        const base64Data = selfieImageUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        const cloudinaryResult = await uploadImage(buffer, 'worker-calling/selfies');
        selfieImageUrl = cloudinaryResult.secure_url;
        console.log('[NID Verification] Selfie uploaded to Cloudinary:', selfieImageUrl);
      } else {
        console.log('[NID Verification] Cloudinary not configured, storing selfie as base64');
      }
    } catch (error) {
      console.error('[NID Verification] Failed to upload selfie to Cloudinary, using base64:', error.message);
      // Continue with base64 if Cloudinary fails
    }
  }
  
  // If no image URL but file was uploaded, convert to base64
  if (!nidImageUrl && req.file) {
    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;
    nidImageUrl = `data:${mimeType};base64,${base64Image}`;
  }
  
  if (!nidImageUrl) {
    return res.status(400).json({
      success: false,
      message: 'NID image is required. Please upload an image file.'
    });
  }

  // Process face verification data
  let faceVerificationResults = null;
  let faceMatchPassed = false;
  
  console.log('[NID Verification] Processing face verification data:', {
    hasSelfieDescriptor: !!req.body.selfie_descriptor,
    hasFaceMatches: !!req.body.face_matches
  });
  
  try {
    const selfieDescriptor = req.body.selfie_descriptor ? JSON.parse(req.body.selfie_descriptor) : null;
    const faceMatches = req.body.face_matches ? JSON.parse(req.body.face_matches) : null;
    
    console.log('[NID Verification] Parsed face verification:', {
      hasDescriptor: !!selfieDescriptor,
      descriptorLength: selfieDescriptor?.length,
      hasMatches: !!faceMatches,
      matchKeys: faceMatches ? Object.keys(faceMatches) : []
    });
    
    if (selfieDescriptor && faceMatches) {
      // Validate descriptor
      if (!isValidDescriptor(selfieDescriptor)) {
        console.warn('[NID Verification] Invalid selfie descriptor format');
      } else {
        // Get profile photo descriptor if available (would need to extract from profile photo)
        // For now, use the matches sent from frontend
        faceVerificationResults = {
          selfie_descriptor: selfieDescriptor,
          matches: faceMatches,
          verified: false
        };
        
        // ALL THREE IMAGES ARE REQUIRED: Selfie, Profile Photo, and NID Photo
        // All must match for verification to pass
        const nidMatchAvailable = faceMatches.nid && !faceMatches.nid.error;
        const profileMatchAvailable = faceMatches.profile && !faceMatches.profile.error;
        
        // Both NID and Profile matches are REQUIRED
        if (nidMatchAvailable && profileMatchAvailable) {
          // Both matches must pass
          const nidPassed = faceMatches.nid.matched === true;
          const profilePassed = faceMatches.profile.matched === true;
          faceMatchPassed = nidPassed && profilePassed;
          
          if (!faceMatchPassed) {
            console.log('[NID Verification] Face verification FAILED - Not all matches passed:', {
              nidPassed,
              profilePassed,
              nidDistance: faceMatches.nid.distance,
              profileDistance: faceMatches.profile.distance
            });
          }
        } else {
          // Missing required matches
          faceMatchPassed = false;
          console.warn('[NID Verification] Face verification FAILED - Missing required matches:', {
            nidMatchAvailable,
            profileMatchAvailable,
            nidError: faceMatches.nid?.error,
            profileError: faceMatches.profile?.error
          });
        }
        
        console.log('[NID Verification] Face match evaluation:', {
          nidMatchRequired: true, // Both NID and Profile matches are required
          profileMatchRequired: true, // Both NID and Profile matches are required
          faceMatchPassed,
          profileMatch: faceMatches.profile ? {
            matched: faceMatches.profile.matched,
            distance: faceMatches.profile.distance,
            hasError: !!faceMatches.profile.error,
            error: faceMatches.profile.error
          } : null,
          nidMatch: faceMatches.nid ? {
            matched: faceMatches.nid.matched,
            distance: faceMatches.nid.distance,
            hasError: !!faceMatches.nid.error,
            error: faceMatches.nid.error
          } : null
        });
        faceVerificationResults.verified = faceMatchPassed;
        
        console.log('[NID Verification] Face verification results:', {
          profile_match: faceMatches.profile?.matched,
          nid_match: faceMatches.nid?.matched,
          all_matched: faceMatchPassed
        });
      }
    } else {
      console.log('[NID Verification] Face verification data not provided - proceeding with OCR only');
    }
  } catch (error) {
    console.error('[NID Verification] Error processing face verification:', error);
    // Continue with OCR verification even if face verification fails
  }
  
  // Extract data from NID image using OCR.Space API
  console.log(`[NID Verification] Extracting data for user ${userId}...`);
  const extractionResult = await extractNIDData(nidImageUrl);
  
  let extractedData = null;
  let extractionError = null;
  let validationErrors = [];
  
  if (!extractionResult.success) {
    // Extraction failed - still create verification record for admin review
    extractionError = extractionResult.error || 'Failed to extract NID data from image';
    console.log('[NID Verification] Extraction failed, but creating record for admin review:', extractionError);
    
    // Create minimal extracted data structure for failed extractions
    extractedData = {
      extraction_error: extractionError,
      extraction_confidence: 0,
      full_name: null,
      nid_number: null,
      date_of_birth: null,
      gender: null,
      address: null,
      father_name: null,
      mother_name: null,
      language_detected: 'Unknown',
      image_quality: 'Poor',
      tampering_suspected: false
    };
    
    // Handle quota/timeout/network errors - still create record but return appropriate status
    if (extractionResult.quotaExceeded || extractionResult.timeout || extractionResult.networkError) {
      // These are temporary errors - we'll still create the record but inform the user
      // The record will be created in the transaction below
    }
  } else {
    extractedData = extractionResult.data;
    console.log('[NID Verification] Extracted data:', JSON.stringify(extractedData, null, 2));
    
    // Validate extracted data (but don't block submission)
    const validation = validateExtractedData(extractedData);
    validationErrors = validation.errors || [];
    console.log('[NID Verification] Validation result:', validation);
  }
  
  // Check NID uniqueness only if NID number was extracted
  let uniquenessCheck = { isUnique: true };
  if (extractedData && extractedData.nid_number) {
    uniquenessCheck = await checkNIDUniqueness(extractedData.nid_number, userId);
    if (!uniquenessCheck.isUnique) {
      validationErrors.push(uniquenessCheck.message);
    }
  }
  
  // Compare extracted name with user's registered name
  const nameSimilarity = extractedData.full_name && req.user.full_name
    ? calculateNameSimilarity(extractedData.full_name, req.user.full_name)
    : 0;
  const nameMatch = nameSimilarity >= MIN_NAME_SIMILARITY;
  
  // Calculate age
  const age = extractedData.date_of_birth ? calculateAge(extractedData.date_of_birth) : null;
  const ageValid = age !== null ? age >= MIN_AGE : null;
  
  console.log('[NID Verification] Validation checks:', {
    extraction_confidence: extractedData.extraction_confidence,
    name_similarity: nameSimilarity,
    age: age,
    age_valid: ageValid,
    tampering_suspected: extractedData.tampering_suspected
  });
  
  // Determine verification status
  let verificationStatus = 'pending';
  let autoRejectionReason = null;
  let autoApprovalReason = null;
  
  // Auto-reject conditions
  if (extractedData.extraction_confidence < MIN_EXTRACTION_CONFIDENCE) {
    verificationStatus = 'auto_rejected';
    autoRejectionReason = `Extraction confidence (${extractedData.extraction_confidence}%) is below minimum threshold`;
  } else if (extractedData.tampering_suspected) {
    verificationStatus = 'auto_rejected';
    autoRejectionReason = 'Image tampering detected';
  } else if (age !== null && age < MIN_AGE) {
    verificationStatus = 'auto_rejected';
    autoRejectionReason = `Age verification failed. Must be at least ${MIN_AGE} years old.`;
  }
  // Auto-approve conditions (all must be true)
  // NOW INCLUDES FACE VERIFICATION: All three images (Selfie, Profile, NID) must match
  else if (
    extractedData.extraction_confidence >= AUTO_APPROVE_CONFIDENCE &&
    nameSimilarity >= AUTO_APPROVE_NAME_SIMILARITY &&
    ageValid === true &&
    !extractedData.tampering_suspected &&
    extractedData.full_name &&
    extractedData.nid_number &&
    extractedData.date_of_birth &&
    faceVerificationResults && faceMatchPassed // Face verification REQUIRED - all three images (Selfie, Profile, NID) must match
  ) {
    verificationStatus = 'approved';
    const faceStatus = faceVerificationResults 
      ? `, all three face images matched (Selfie, Profile, NID)`
      : '';
    autoApprovalReason = `Auto-approved: High confidence (${extractedData.extraction_confidence}%), name match (${Math.round(nameSimilarity * 100)}%), valid age (${age} years), no tampering detected${faceStatus}`;
    console.log('[NID Verification] ✅ AUTO-APPROVED:', autoApprovalReason);
  } else if (
    extractedData.extraction_confidence >= AUTO_APPROVE_CONFIDENCE &&
    nameSimilarity >= AUTO_APPROVE_NAME_SIMILARITY &&
    ageValid === true &&
    !extractedData.tampering_suspected &&
    extractedData.full_name &&
    extractedData.nid_number &&
    extractedData.date_of_birth &&
    faceVerificationResults &&
    !faceMatchPassed
  ) {
    // OCR passed but face verification failed - send to admin for review (don't auto-reject)
    verificationStatus = 'pending';
    autoRejectionReason = null; // No auto-rejection, let admin decide
    console.log('[NID Verification] ⚠️ PENDING - OCR passed but face matching failed. Sending to admin for review.');
  }
  // Otherwise, mark as pending (needs admin review)
  else {
    verificationStatus = 'auto_rejected';
    autoRejectionReason = 'Verification requires manual admin review. Data extracted but did not meet auto-approval criteria.';
    console.log('[NID Verification] ❌ AUTO-REJECTED - Requires manual admin review');
  }
  
  // Store verification in database
  console.log('[NID Verification] Starting database transaction...');
  let verificationResult;
  try {
    verificationResult = await transaction(async (client) => {
      // Insert verification record
      console.log('[NID Verification] Inserting verification record with data:', {
        userId,
        verificationStatus,
        extraction_confidence: extractedData.extraction_confidence,
        hasImage: !!nidImageUrl
      });
      
      // Include validation errors and extraction error in extracted_data
      const dataToStore = {
        ...extractedData,
        validation_errors: validationErrors,
        extraction_error: extractionError,
        uniqueness_check: !uniquenessCheck.isUnique ? uniquenessCheck.message : null
      };
      
      // Include face verification data in extracted_data
      if (faceVerificationResults) {
        dataToStore.face_verification = {
          selfie_image_url: selfieImageUrl,
          selfie_descriptor: faceVerificationResults.selfie_descriptor,
          matches: faceVerificationResults.matches,
          verified: faceVerificationResults.verified
        };
      }
      
      // Store name similarity for display
      dataToStore.name_similarity = nameSimilarity;
      
      // Handle nid_image_url length limit (VARCHAR(500))
      // If base64 image is too long, store full image in extracted_data and truncate URL
      let nidImageUrlToStore = nidImageUrl;
      if (nidImageUrl && nidImageUrl.length > 500) {
        // Store full base64 image in extracted_data
        dataToStore.nid_image_full = nidImageUrl;
        // Truncate for the URL column (just store a marker indicating it's in extracted_data)
        nidImageUrlToStore = nidImageUrl.substring(0, 497) + '...';
        console.log('[NID Verification] NID image URL truncated (length:', nidImageUrl.length, 'chars). Full image stored in extracted_data.nid_image_full');
      }

      const insertResult = await client.query(
        `INSERT INTO nid_verifications (
          user_id, user_consent, nid_image_url, extracted_data,
          verification_status, extraction_confidence, image_quality,
          tampering_suspected, language_detected, name_match,
          nid_format_valid, age_valid, nid_unique, auto_rejection_reason, auto_approval_reason,
          selfie_image_url, selfie_descriptor, face_verification_results, face_match_passed
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING id, verification_status, submitted_at`,
        [
          userId,
          user_consent,
          nidImageUrlToStore, // Truncated if > 500 chars (full image in extracted_data.nid_image_full)
          JSON.stringify(dataToStore),
          verificationStatus,
          extractedData?.extraction_confidence || 0,
          extractedData?.image_quality || 'Unknown',
          extractedData?.tampering_suspected || false,
          extractedData?.language_detected || 'Unknown',
          nameMatch,
          extractedData?.nid_number ? true : false, // nid_format_valid
          ageValid,
          uniquenessCheck.isUnique, // nid_unique
          autoRejectionReason,
          autoApprovalReason,
          selfieImageUrl || null, // selfie_image_url (TEXT column, can store long base64)
          faceVerificationResults?.selfie_descriptor ? JSON.stringify(faceVerificationResults.selfie_descriptor) : null, // selfie_descriptor
          faceVerificationResults ? JSON.stringify(faceVerificationResults.matches) : null, // face_verification_results
          faceMatchPassed // face_match_passed
        ]
      );
      
      console.log('[NID Verification] Insert result:', insertResult.rows[0]);
      console.log('[NID Verification] Verification stored with ID:', insertResult.rows[0].id);
      console.log('[NID Verification] Status:', verificationStatus);
      console.log('[NID Verification] Has selfie:', !!selfieImageUrl);
      console.log('[NID Verification] Has face verification:', !!faceVerificationResults);
      
      // Handle auto-approval
      if (verificationStatus === 'approved') {
        console.log('[NID Verification] Processing auto-approval...');
        
        // Encrypt and store NID number
        const encryptedNID = encrypt(extractedData.nid_number);
        
        // Update user verification status and store encrypted NID
        // Note: Do NOT activate worker account - admin must approve activation separately
        await client.query(
          `UPDATE users 
           SET nid_verification_status = 'approved',
               nid_number_encrypted = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [encryptedNID, userId]
        );
        
        // Don't send notification on auto-approval - wait for admin review
        // Notification will be sent when admin approves/rejects
        
        // Log the auto-approval
        await client.query(
          `INSERT INTO nid_verification_logs (verification_id, user_id, action, details)
           VALUES ($1, $2, $3, $4)`,
          [
            insertResult.rows[0].id,
            userId,
            'auto_approved',
            JSON.stringify({
              reason: autoApprovalReason,
              extraction_confidence: extractedData.extraction_confidence,
              name_similarity: nameSimilarity,
              age: age
            })
          ]
        );
        
        console.log('[NID Verification] ✅ Auto-approved successfully');
      }
      // Handle auto-rejection
      else if (verificationStatus === 'auto_rejected') {
        // Update user verification status
        await client.query(
          `UPDATE users 
           SET nid_verification_status = 'rejected', updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [userId]
        );
        
        // Log the auto-rejection
        await client.query(
          `INSERT INTO nid_verification_logs (verification_id, user_id, action, details)
           VALUES ($1, $2, $3, $4)`,
          [
            insertResult.rows[0].id,
            userId,
            'auto_rejected',
            JSON.stringify({
              reason: autoRejectionReason,
              extraction_confidence: extractedData.extraction_confidence
            })
          ]
        );
      }
      // Handle auto_rejected (requires admin review)
      else {
        // Update user verification status to auto_rejected
        await client.query(
          `UPDATE users 
           SET nid_verification_status = 'auto_rejected', updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [userId]
        );
        
        // Log the submission
        await client.query(
          `INSERT INTO nid_verification_logs (verification_id, user_id, action, details)
           VALUES ($1, $2, $3, $4)`,
          [
            insertResult.rows[0].id,
            userId,
            'submitted',
            JSON.stringify({
              extraction_confidence: extractedData.extraction_confidence,
              requires_manual_review: true
            })
          ]
        );
      }
      
      console.log('[NID Verification] User status updated to:', verificationStatus);
      
      // If auto-rejected or auto-approved, schedule image deletion (only for Cloudinary URLs)
      if ((verificationStatus === 'auto_rejected' || verificationStatus === 'approved') && cloudinaryPublicId && nidImageUrl.startsWith('http')) {
        // Delete immediately for auto-processed verifications
        setTimeout(async () => {
          try {
            await deleteImage(cloudinaryPublicId);
            console.log(`[NID Verification] Deleted ${verificationStatus} image: ${cloudinaryPublicId}`);
          } catch (err) {
            console.error('Error deleting image:', err);
          }
        }, 1000);
      } else if ((verificationStatus === 'auto_rejected' || verificationStatus === 'approved') && nidImageUrl.startsWith('data:')) {
        // Base64 image - no deletion needed
        console.log('[NID Verification] Base64 image used (no deletion needed)');
      }
      
      return insertResult.rows[0];
    });
    
    console.log('[NID Verification] Transaction completed successfully:', verificationResult);
    
    // Send approval email if auto-approved
    if (verificationStatus === 'approved') {
      try {
        await sendVerificationApprovedEmail(req.user.email, req.user.full_name);
        console.log('[NID Verification] Approval email sent');
      } catch (err) {
        console.error('Error sending approval email:', err);
      }
    }
  } catch (error) {
    console.error('[NID Verification] Database transaction error:', error);
    console.error('[NID Verification] Error stack:', error.stack);
    console.error('[NID Verification] Error details:', {
      message: error.message,
      code: error.code,
      constraint: error.constraint,
      detail: error.detail
    });
    
    // Delete uploaded image if database operation fails
    if (cloudinaryPublicId) {
      try {
        await deleteImage(cloudinaryPublicId);
      } catch (err) {
        console.error('Error deleting image after database failure:', err);
      }
    }
    
    // Provide more specific error messages
    let errorMessage = 'Failed to save NID verification. Please try again.';
    if (error.code === '23505') { // Unique constraint violation
      errorMessage = 'A verification record already exists. Please wait for admin review.';
    } else if (error.code === '23503') { // Foreign key violation
      errorMessage = 'Invalid user account. Please contact support.';
    } else if (error.message && error.message.includes('column')) {
      errorMessage = 'Database configuration error. Please contact support.';
    }
    
    return res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
  
  // Security: Don't reveal verification status to workers before admin review
  // Always use generic message regardless of auto-approval/rejection
  const message = 'Verification submitted successfully. Your request is under review and you will be notified once processed.';
  
  // Prepare face verification details for response
  let faceVerificationDetails = null;
  if (faceVerificationResults) {
    faceVerificationDetails = {
      verified: faceMatchPassed,
      matches: {
        profile: faceVerificationResults.matches.profile ? {
          matched: faceVerificationResults.matches.profile.matched,
          distance: faceVerificationResults.matches.profile.distance,
          confidence: faceVerificationResults.matches.profile.matched 
            ? Math.max(0, Math.min(100, Math.round((1 - faceVerificationResults.matches.profile.distance / 0.6) * 100)))
            : 0
        } : null,
        nid: faceVerificationResults.matches.nid ? {
          matched: faceVerificationResults.matches.nid.matched,
          distance: faceVerificationResults.matches.nid.distance,
          confidence: faceVerificationResults.matches.nid.matched
            ? Math.max(0, Math.min(100, Math.round((1 - faceVerificationResults.matches.nid.distance / 0.6) * 100)))
            : 0
        } : null
      }
    };
  }

  // Security: Don't expose verification details to workers before admin review
  res.json({
    success: true,
    message: message,
    data: {
      verification_id: verificationResult.id,
      verification_status: 'pending', // Always show as pending to workers, regardless of actual status
      submitted_at: verificationResult.submitted_at,
      // Don't expose any detailed information before admin review
      extraction_confidence: null,
      image_quality: null,
      name_match: null,
      name_similarity: null,
      age: null,
      age_valid: null,
      face_verification: null,
      auto_rejection_reason: null,
      auto_approval_reason: null,
      auto_approved: false,
      auto_rejected: false,
      errors: []
    }
  });
});

// Note: calculateAge and calculateNameSimilarity are now imported from ocrService

// @desc    Get user's NID verification status
// @route   GET /api/verification/nid/status
// @access  Private
const getVerificationStatus = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const result = await query(
    `SELECT 
      id, verification_status, submitted_at, extraction_confidence,
      image_quality, name_match, age_valid, auto_rejection_reason,
      auto_approval_reason, reviewed_at, reviewed_by, rejection_reason,
      extracted_data, face_verification_results, face_match_passed
     FROM nid_verifications
     WHERE user_id = $1
     ORDER BY submitted_at DESC
     LIMIT 1`,
    [userId]
  );
  
  if (result.rows.length === 0) {
    return res.json({
      success: true,
      data: {
        verification_status: 'not_submitted',
        has_verification: false
      }
    });
  }
  
  const verification = result.rows[0];
  
  // Parse extracted data and face verification results
  let extractedData = null;
  let faceVerificationDetails = null;
  
  if (verification.extracted_data) {
    try {
      extractedData = typeof verification.extracted_data === 'string' 
        ? JSON.parse(verification.extracted_data) 
        : verification.extracted_data;
    } catch (e) {
      console.error('Error parsing extracted_data:', e);
    }
  }
  
  if (verification.face_verification_results) {
    try {
      const faceResults = typeof verification.face_verification_results === 'string'
        ? JSON.parse(verification.face_verification_results)
        : verification.face_verification_results;
      
      // Calculate confidence percentages from distances
      faceVerificationDetails = {
        verified: verification.face_match_passed,
        matches: {
          profile: faceResults.profile ? {
            matched: faceResults.profile.matched,
            distance: faceResults.profile.distance,
            confidence: faceResults.profile.matched
              ? Math.max(0, Math.min(100, Math.round((1 - faceResults.profile.distance / 0.6) * 100)))
              : 0
          } : null,
          nid: faceResults.nid ? {
            matched: faceResults.nid.matched,
            distance: faceResults.nid.distance,
            confidence: faceResults.nid.matched
              ? Math.max(0, Math.min(100, Math.round((1 - faceResults.nid.distance / 0.6) * 100)))
              : 0
          } : null
        }
      };
    } catch (e) {
      console.error('Error parsing face_verification_results:', e);
    }
  }
  
  // Security: Don't expose verification details to workers before admin review
  // Only show basic status until admin has reviewed
  const isReviewed = !!verification.reviewed_by;
  
  res.json({
    success: true,
    data: {
      has_verification: true,
      verification_status: verification.verification_status,
      submitted_at: verification.submitted_at,
      // Only expose detailed information after admin review for security
      extraction_confidence: isReviewed ? verification.extraction_confidence : null,
      image_quality: isReviewed ? verification.image_quality : null,
      name_match: isReviewed ? verification.name_match : null,
      age_valid: isReviewed ? verification.age_valid : null,
      name_similarity: isReviewed ? (extractedData?.name_similarity || null) : null,
      age: isReviewed && extractedData?.date_of_birth ? (() => {
        const age = calculateAge(extractedData.date_of_birth);
        return age;
      })() : null,
      face_verification: isReviewed ? faceVerificationDetails : null,
      auto_rejection_reason: isReviewed ? verification.auto_rejection_reason : null,
      auto_approval_reason: isReviewed ? verification.auto_approval_reason : null,
      auto_approved: isReviewed ? (verification.verification_status === 'approved' && !verification.reviewed_by) : false,
      auto_rejected: isReviewed ? (verification.verification_status === 'auto_rejected') : false,
      reviewed_at: verification.reviewed_at,
      reviewed_by: verification.reviewed_by,
      rejection_reason: verification.rejection_reason
    }
  });
});

module.exports = {
  submitNIDVerification,
  getVerificationStatus
};

