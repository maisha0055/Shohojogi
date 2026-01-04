import React, { useState, useEffect, useRef } from 'react';
import Modal from '../common/Modal';
import LocationPickerLeaflet from '../common/LocationPickerLeaflet';
import { toast } from 'react-toastify';
import { useLanguage } from '../../context/LanguageContext';
import bookingService from '../../services/bookingService';

const InstantCallModal = ({ isOpen, onClose, onCall, serviceCategoryId, serviceCategoryName, onCallSuccess }) => {
  const { t } = useLanguage();
  const [serviceDescription, setServiceDescription] = useState('');
  const [location, setLocation] = useState(null);
  const [preciseLocation, setPreciseLocation] = useState('');
  const [calling, setCalling] = useState(false);
  const [userHasSelectedLocation, setUserHasSelectedLocation] = useState(false);
  const [images, setImages] = useState([]);
  const [imageUrls, setImageUrls] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const fileInputRef = useRef(null);

  const handleLocationSelect = (selectedLocation) => {
    // Only set location if user has actually selected it (not default map center)
    if (selectedLocation && selectedLocation.lat && selectedLocation.lng) {
      setLocation(selectedLocation);
      setUserHasSelectedLocation(true);
    } else {
      setLocation(null);
      setUserHasSelectedLocation(false);
    }
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;
    
    if (images.length + files.length > 3) {
      toast.error(t('callWorker.max3Images'));
      return;
    }

    const newImages = [...images, ...files.slice(0, 3 - images.length)];
    setImages(newImages);

    // Create preview URLs
    const newUrls = newImages.map(file => URL.createObjectURL(file));
    setImageUrls(newUrls);
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    const newUrls = imageUrls.filter((_, i) => i !== index);
    setImages(newImages);
    setImageUrls(newUrls);
    
    // Revoke object URL to free memory
    URL.revokeObjectURL(imageUrls[index]);
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setServiceDescription('');
      setLocation(null);
      setPreciseLocation('');
      setUserHasSelectedLocation(false);
      setImages([]);
      setImageUrls([]);
      setPaymentMethod('cash');
      // Revoke all object URLs
      imageUrls.forEach(url => URL.revokeObjectURL(url));
    }
  }, [isOpen]);

  const handleCall = async () => {
    if (!serviceDescription.trim()) {
      toast.error(t('callWorker.fillAllRequiredFields'));
      return;
    }

    if (images.length === 0) {
      toast.error(t('callWorker.uploadAtLeast1Image'));
      return;
    }

    if (!location || !location.lat || !location.lng) {
      toast.error(t('location.pleaseSelectLocation'));
      return;
    }

    // Validate location coordinates
    if (isNaN(location.lat) || isNaN(location.lng)) {
      toast.error(t('location.pleaseSelectLocation'));
      return;
    }

    // Combine base location with precise location details
    let fullLocation = location.address || `Location at ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
    if (preciseLocation.trim()) {
      fullLocation = `${fullLocation}. ${preciseLocation.trim()}`;
    }

    const callData = {
      service_category_id: serviceCategoryId,
      service_description: serviceDescription.trim(),
      service_location: fullLocation,
      location_latitude: parseFloat(location.lat),
      location_longitude: parseFloat(location.lng),
      payment_method: paymentMethod,
    };

    setCalling(true);
    try {
      const response = await onCall(callData, images);
      toast.success(t('booking.callRequestSentSuccessfully'));
      
      // Reset form
      setServiceDescription('');
      setLocation(null);
      setImages([]);
      setImageUrls([]);
      imageUrls.forEach(url => URL.revokeObjectURL(url));
      
      // Call the success callback if provided (to show response modal)
      if (onCallSuccess && response) {
        onCallSuccess(response);
      } else {
        // Default behavior: close modal
        onClose();
      }
    } catch (error) {
      console.error('Error calling worker:', error);
      toast.error(error.response?.data?.message || 'Failed to call workers. Please try again.');
    } finally {
      setCalling(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('booking.callWorkers')} size="lg">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('worker.serviceCategory')}
          </label>
          <div className="px-4 py-2 bg-gray-50 rounded-lg border border-gray-300">
            {serviceCategoryName || t('worker.selectCategory')}
          </div>
        </div>

        {/* Service Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('booking.serviceDescription')} *
          </label>
          <textarea
            value={serviceDescription}
            onChange={(e) => setServiceDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder={t('workerDetails.describeWorkNeeded')}
            required
          />
        </div>

        {/* Image Upload */}
        <div className="bg-white border border-gray-300 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            📸 {t('callWorker.uploadImagesOfServiceProblem')} *
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={handleImageSelect}
            className="hidden"
            id="image-upload-input-modal"
          />
          <div className="space-y-3">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={images.length >= 3}
                className="flex-1 py-4 px-6 border-2 border-dashed border-primary-400 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-primary-50/30"
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-3xl">📷</span>
                  <span className="font-medium text-gray-700">
                    {images.length === 0 
                      ? t('callWorker.clickToUploadImages') 
                      : t('callWorker.addMoreImages', { count: images.length }).replace('{{count}}', images.length)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {t('callWorker.cameraOrGallery')}
                  </span>
                </div>
              </button>
            </div>
            
            {imageUrls.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  {t('callWorker.uploadedImages')} ({imageUrls.length}/3):
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {imageUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-40 object-cover rounded-lg border-2 border-gray-200 hover:border-primary-400 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-red-600 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title={t('callWorker.removeImage')}
                      >
                        ×
                      </button>
                      <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                        {t('callWorker.image')} {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {images.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>{t('callWorker.required')}:</strong> {t('callWorker.uploadAtLeast1Image')}. 
                  {t('callWorker.workersNeedToSeeIssue')}
                </p>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            💡 <strong>{t('callWorker.tip')}:</strong> {t('callWorker.uploadClearImages')}
          </p>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('payment.paymentMethod')} *
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label
              className={`flex items-center p-4 border-2 rounded-lg cursor-pointer ${
                paymentMethod === 'cash'
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="payment_method"
                value="cash"
                checked={paymentMethod === 'cash'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="sr-only"
              />
              <div>
                <div className="font-semibold">💵 {t('payment.cash')}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {t('payment.payAfterService')}
                </div>
              </div>
            </label>

            <label
              className={`flex items-center p-4 border-2 rounded-lg cursor-pointer ${
                paymentMethod === 'online'
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="payment_method"
                value="online"
                checked={paymentMethod === 'online'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="sr-only"
              />
              <div>
                <div className="font-semibold">💳 {t('payment.online')}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {t('payment.onlinePaymentAfterWork')}
                </div>
              </div>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('location.selectLocation')} *
          </label>
          <p className="text-xs text-gray-500 mb-2">
            {t('location.selectOnMap')}
          </p>
          {!location && (
            <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
              ⚠️ {t('location.pleaseSelectLocation')}
            </div>
          )}
          {location && (
            <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
              ✓ {t('location.locationSelected')}: {location.address || `Lat: ${location.lat?.toFixed(6)}, Lng: ${location.lng?.toFixed(6)}`}
            </div>
          )}
          <LocationPickerLeaflet
            onLocationSelect={handleLocationSelect}
            height="300px"
          />
          
          {/* Precise Location Field */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📍 {t('location.preciseLocation')} <span className="text-gray-500 text-xs">({t('common.optional')})</span>
            </label>
            <textarea
              value={preciseLocation}
              onChange={(e) => setPreciseLocation(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder={t('location.preciseLocationPlaceholder')}
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('location.preciseLocationHint')}
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-blue-800 text-xl mr-3">ℹ️</span>
            <div>
              <p className="text-sm text-blue-800 font-semibold mb-1">
                {t('booking.howItWorks')}:
              </p>
              <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                <li>{t('booking.provideServiceDescriptionRequired')}</li>
                <li>{t('booking.uploadImagesRequired')}</li>
                <li>{t('booking.workersReviewAndSubmitEstimates')}</li>
                <li>{t('booking.youChooseBestEstimate')}</li>
                <li>{t('booking.noAutoPriceEstimation')}</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={onClose}
            className="flex-1 btn-secondary"
            disabled={calling}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleCall}
            disabled={calling || !serviceDescription.trim() || images.length === 0 || !location || !location?.lat || !location?.lng}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {calling ? t('booking.callingWorkers') : `📞 ${t('booking.callForWorkerNow')}`}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default InstantCallModal;

