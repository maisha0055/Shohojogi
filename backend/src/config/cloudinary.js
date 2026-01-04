const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload image to Cloudinary
const uploadImage = async (fileBuffer, folder = 'worker-calling') => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'auto',
        transformation: [
          { width: 800, height: 800, crop: 'limit' },
          { quality: 'auto:good' },
        ],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    ).end(fileBuffer);
  });
};

// Delete image from Cloudinary (optional - only if configured)
const deleteImage = async (publicId) => {
  if (!publicId) {
    return; // No image to delete (base64 or already deleted)
  }

  // Check if Cloudinary is configured
  const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && 
                                   process.env.CLOUDINARY_API_KEY && 
                                   process.env.CLOUDINARY_API_SECRET;

  if (!isCloudinaryConfigured) {
    console.log('[Cloudinary] Skipping image deletion (Cloudinary not configured)');
    return;
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error.message);
    // Don't throw - image deletion failure shouldn't break the flow
  }
};

// Upload multiple images
const uploadMultipleImages = async (files, folder = 'worker-calling') => {
  const uploadPromises = files.map((file) => uploadImage(file.buffer, folder));
  return Promise.all(uploadPromises);
};

module.exports = {
  cloudinary,
  uploadImage,
  deleteImage,
  uploadMultipleImages,
};