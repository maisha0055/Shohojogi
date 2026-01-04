import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import { toast } from 'react-toastify';
import Loader from '../common/Loader';
import Modal from '../common/Modal';
import FaceVerification from './FaceVerification';

const Verification = () => {
  const { t } = useLanguage();
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
      } else {
        // Set a default status if API call fails
        setVerificationStatus({ verification_status: 'not_submitted', has_verification: false });
      }
    } catch (error) {
      console.error('Error fetching verification status:', error);
      // Set a default status on error so loader doesn't show forever
      setVerificationStatus({ verification_status: 'not_submitted', has_verification: false });
    }
  };

  useEffect(() => {
    // Only fetch verification status for workers
    if (user && user.role === 'worker') {
      fetchVerificationStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Only show verification for workers
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
    console.log('[Verification] Face verification complete, data received:', {
      hasSelfieImage: !!faceData.selfieImage,
      hasDescriptor: !!faceData.selfieDescriptor,
      hasMatches: !!faceData.matches
    });
    setFaceVerificationData(faceData);
    setShowFaceVerification(false);
    setVerificationStep('submitting');
    // Pass faceData directly to avoid state timing issues
    handleFinalSubmit(faceData);
  };

  const handleFinalSubmit = async (faceDataToUse = null) => {
    // Use passed faceData or state (for manual calls)
    const finalFaceData = faceDataToUse || faceVerificationData;
    
    // More detailed validation
    if (!selectedFile) {
      toast.error('Please upload your NID image');
      return;
    }
    if (!userConsent) {
      toast.error('Please provide consent to proceed');
      return;
    }
    if (!finalFaceData) {
      toast.error('Please complete the live selfie verification');
      console.error('[Verification] Face verification data missing:', {
        faceDataToUse: !!faceDataToUse,
        faceVerificationData: !!faceVerificationData
      });
      return;
    }
    
    console.log('[Verification] Submitting verification with face data:', {
      hasSelfieImage: !!finalFaceData.selfieImage,
      hasDescriptor: !!finalFaceData.selfieDescriptor,
      hasMatches: !!finalFaceData.matches
    });

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('nid_image', selectedFile);
      formData.append('user_consent', 'true');
      formData.append('selfie_image', finalFaceData.selfieImage);
      formData.append('selfie_descriptor', JSON.stringify(finalFaceData.selfieDescriptor));
      formData.append('face_matches', JSON.stringify(finalFaceData.matches));
      
      console.log('[Verification] FormData prepared:', {
        hasNidImage: !!selectedFile,
        hasSelfieImage: !!finalFaceData.selfieImage,
        hasDescriptor: !!finalFaceData.selfieDescriptor,
        hasMatches: !!finalFaceData.matches
      });

      const response = await api.post('/api/verification/nid', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        console.log('[Verification] Submission successful:', response.data);
        toast.success(response.data.message);
        setSelectedFile(null);
        setPreview(null);
        setUserConsent(false);
        setShowConsentModal(false);
        setFaceVerificationData(null);
        setVerificationStep('nid');
        setQuotaError(null);
        setRetryCountdown(null);
        // Refresh verification status to show updated data
        await fetchVerificationStatus();
      } else {
        console.error('[Verification] Submission failed:', response.data);
        toast.error(response.data.message || 'Failed to submit verification');
      }
    } catch (error) {
      // Handle errors
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
        console.error('[Verification] Submission error:', {
          status: error.response?.status,
          message: error.response?.data?.message,
          errors: error.response?.data?.errors,
          fullError: error
        });
        const errorMessage = error.response?.data?.message || 'Failed to submit verification';
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
        'approved': { color: 'bg-green-500', text: t('verification.verified') },
        'rejected': { color: 'bg-red-500', text: t('verification.rejected') },
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
        {t('verification.pending')}
      </span>
    );
  };

  // Don't show loader, just show default empty state if status is not yet loaded
  // This prevents the loader from appearing under "Account Active" section
  if (!verificationStatus) {
    return null; // Return null instead of Loader to prevent loading indicator
  }

  // Don't show the verification section if already approved by admin
  if (verificationStatus.verification_status === 'approved' && verificationStatus.reviewed_by) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{t('verification.verification')}</h2>
            <p className="text-sm text-gray-600 mt-1">{t('verification.yourAccountIsVerified')}</p>
          </div>
          {getStatusBadge(verificationStatus.verification_status, verificationStatus.reviewed_by)}
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-green-800 font-medium">
              {t('verification.verificationApprovedMessage')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{t('verification.verification')}</h2>
          <p className="text-sm text-gray-600 mt-1">{t('verification.completeVerificationToActivate')}</p>
        </div>
        {getStatusBadge(verificationStatus.verification_status || 'not_submitted', verificationStatus.reviewed_by)}
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
              {t('verification.requestPending')}
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
              <p className="text-red-800 font-semibold mb-2">{t('verification.verificationRejected')}</p>
              {verificationStatus.rejection_reason ? (
                <div className="space-y-2">
                  <div className="bg-red-100 border border-red-300 rounded p-3">
                    <p className="text-red-900 font-medium text-sm mb-1">{t('verification.rejectionReason')}:</p>
                    <p className="text-red-800 text-sm leading-relaxed">{verificationStatus.rejection_reason}</p>
                  </div>
                  <p className="text-red-700 text-sm mt-2">{t('verification.canResubmit')}</p>
                </div>
              ) : (
                <p className="text-red-700 text-sm">{t('verification.canResubmit')}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Verification Status - Only show basic status, no details before admin review */}
      {verificationStatus.has_verification && verificationStatus.verification_status !== 'not_submitted' && !verificationStatus.reviewed_by && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-blue-800 font-medium">{t('verification.verificationSubmitted')}</p>
              <p className="text-blue-700 text-sm mt-1">
                {t('verification.verificationUnderReview')}
              </p>
            </div>
          </div>
        </div>
      )}

      {(verificationStatus.verification_status === 'not_submitted' || 
        verificationStatus.verification_status === 'rejected' || 
        verificationStatus.verification_status === 'auto_rejected') && (
        <div className="space-y-6">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-5 border border-blue-100">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-500 rounded-lg shadow-sm">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-1">{t('verification.uploadNIDAndSelfie')}</h3>
                <p className="text-sm text-gray-600">{t('verification.completeBothSteps')}</p>
              </div>
            </div>
          </div>

          {/* NID Upload Section */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                <span className="text-blue-600 font-bold text-sm">1</span>
              </div>
              <label className="text-base font-semibold text-gray-800">
                {t('verification.uploadNIDImage')}
              </label>
            </div>
            <div className="mt-1 flex justify-center px-6 pt-6 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-400 transition-all duration-200 bg-gray-50 hover:bg-blue-50">
              <div className="space-y-2 text-center">
                <svg className="mx-auto h-14 w-14 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="flex items-center justify-center text-sm text-gray-600">
                  <label htmlFor="nid-upload" className="relative cursor-pointer bg-white rounded-md font-semibold text-blue-600 hover:text-blue-700 focus-within:outline-none px-4 py-2 border border-blue-300 hover:border-blue-400 transition">
                    <span>{t('verification.chooseNIDImage')}</span>
                    <input
                      id="nid-upload"
                      name="nid-upload"
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleFileSelect}
                    />
                  </label>
                  <p className="pl-3 text-gray-500">{t('verification.orDragAndDrop')}</p>
                </div>
                <p className="text-xs text-gray-500 pt-1">{t('worker.imageFormatHint')}</p>
              </div>
            </div>
          </div>

          {preview && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">{t('verification.nidPreview')}:</p>
              <img
                src={preview}
                alt="NID preview"
                className="max-w-md h-auto border border-gray-300 rounded-lg"
              />
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">{t('verification.requirements')}:</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>{t('verification.clearWellLitImage')}</li>
              <li>{t('verification.allTextVisible')}</li>
              <li>{t('verification.noEditingFilters')}</li>
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
        title={t('verification.step2LiveSelfie')}
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
        title={t('verification.verificationConsent')}
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>{t('verification.important')}:</strong> {t('verification.byProceedingYouConsent')}
            </p>
            <ul className="text-sm text-yellow-800 mt-2 space-y-1 list-disc list-inside">
              <li>{t('verification.processingNIDImage')}</li>
              <li>{t('verification.faceVerificationUsingSelfie')}</li>
              <li><strong>{t('verification.threeWayFaceMatchingRequired')}:</strong> {t('verification.selfieMustMatchBoth')}</li>
              <li>{t('verification.allThreeImagesMustMatch')}</li>
              <li>{t('verification.temporaryStorage')}</li>
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
              {t('verification.iUnderstandAndConsent')}
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
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!userConsent || loading || (quotaError && retryCountdown !== null && retryCountdown > 0)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('verification.submitting') : 
               (quotaError && retryCountdown !== null && retryCountdown > 0) 
                 ? t('verification.waitSeconds', { seconds: retryCountdown }).replace('{{seconds}}', retryCountdown)
                 : t('verification.continueToSelfie')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Verification;

