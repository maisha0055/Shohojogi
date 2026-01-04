const multer = require('multer');
const { FILE_UPLOAD } = require('../config/constants');

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  // Check file type
  if (FILE_UPLOAD.ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, JPG, and PNG are allowed.'), false);
  }
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: FILE_UPLOAD.MAX_SIZE,
  },
  fileFilter: fileFilter,
});

// Single file upload
const uploadSingle = (fieldName) => {
  return (req, res, next) => {
    const uploadMiddleware = upload.single(fieldName);
    
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: `File size too large. Maximum size is ${FILE_UPLOAD.MAX_SIZE / (1024 * 1024)}MB`,
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      next();
    });
  };
};

// Multiple files upload
const uploadMultiple = (fieldName, maxCount = 5) => {
  return (req, res, next) => {
    const uploadMiddleware = upload.array(fieldName, maxCount);
    
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: `File size too large. Maximum size is ${FILE_UPLOAD.MAX_SIZE / (1024 * 1024)}MB`,
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            message: `Too many files. Maximum ${maxCount} files allowed`,
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      next();
    });
  };
};

// Upload and process to Cloudinary (optional - falls back to base64 if not configured)
const uploadToCloudinary = async (req, res, next) => {
  try {
    if (!req.file) {
      return next();
    }

    // Check if Cloudinary is configured
    const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && 
                                   process.env.CLOUDINARY_API_KEY && 
                                   process.env.CLOUDINARY_API_SECRET;

    if (isCloudinaryConfigured) {
      try {
        const { uploadImage } = require('../config/cloudinary');
        
        // Upload to Cloudinary
        const result = await uploadImage(req.file.buffer, 'worker-calling');
        
        // Attach Cloudinary URL to request
        req.cloudinaryUrl = result.secure_url;
        req.cloudinaryPublicId = result.public_id;
      } catch (cloudinaryError) {
        console.warn('Cloudinary upload failed, using base64 fallback:', cloudinaryError.message);
        // Fall through to base64
      }
    }

    // If Cloudinary failed or not configured, use base64
    if (!req.cloudinaryUrl) {
      const base64Image = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype;
      const base64Url = `data:${mimeType};base64,${base64Image}`;
      
      // Warn if base64 is very long (might cause database issues)
      if (base64Url.length > 500) {
        console.warn('[Upload] Base64 image is very long (' + base64Url.length + ' chars). Consider configuring Cloudinary for better performance.');
      }
      
      req.cloudinaryUrl = base64Url;
      req.cloudinaryPublicId = null; // No public ID for base64
      console.log('[Upload] Using base64 encoding (Cloudinary not configured)');
    }
    
    next();
  } catch (error) {
    console.error('Image upload error:', error);
    // Still allow base64 fallback
    if (req.file) {
      const base64Image = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype;
      req.cloudinaryUrl = `data:${mimeType};base64,${base64Image}`;
      req.cloudinaryPublicId = null;
      return next();
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to process image',
    });
  }
};

// Upload multiple to Cloudinary
const uploadMultipleToCloudinary = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return next();
    }

    // Check if Cloudinary is configured
    const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && 
                                   process.env.CLOUDINARY_API_KEY && 
                                   process.env.CLOUDINARY_API_SECRET;

    if (isCloudinaryConfigured) {
      try {
        const { uploadMultipleImages } = require('../config/cloudinary');
        
        // Upload all files to Cloudinary
        const results = await uploadMultipleImages(req.files, 'worker-calling');
        
        // Attach Cloudinary URLs to request
        req.cloudinaryUrls = results.map(result => result.secure_url);
        req.cloudinaryPublicIds = results.map(result => result.public_id);
        
        console.log(`[Upload] ${req.files.length} images uploaded to Cloudinary`);
        return next();
      } catch (cloudinaryError) {
        console.warn('Cloudinary upload failed, using base64 fallback:', cloudinaryError.message);
        // Fall through to base64
      }
    }

    // If Cloudinary failed or not configured, convert to base64
    const base64Urls = [];
    for (const file of req.files) {
      const base64Image = file.buffer.toString('base64');
      const mimeType = file.mimetype;
      const base64Url = `data:${mimeType};base64,${base64Image}`;
      base64Urls.push(base64Url);
    }
    
    req.cloudinaryUrls = base64Urls;
    req.cloudinaryPublicIds = null;
    console.log(`[Upload] ${req.files.length} images converted to base64 (Cloudinary not configured or failed)`);
    
    next();
  } catch (error) {
    console.error('Image upload error:', error);
    // Still allow base64 fallback
    if (req.files && req.files.length > 0) {
      const base64Urls = [];
      for (const file of req.files) {
        const base64Image = file.buffer.toString('base64');
        const mimeType = file.mimetype;
        base64Urls.push(`data:${mimeType};base64,${base64Image}`);
      }
      req.cloudinaryUrls = base64Urls;
      req.cloudinaryPublicIds = null;
      return next();
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to process images',
    });
  }
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadToCloudinary,
  uploadMultipleToCloudinary,
};