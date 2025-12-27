// controllers/uploadController.js
import { asyncHandler } from '../utils/helpers.js';
import s3UploadService from '../services/s3UploadService.js';
import logger from '../utils/logger.js';

class UploadController {
  
  /**
   * Upload custom order images
   */
  uploadCustomOrderImages = asyncHandler(async (req, res) => {
    try {
      const files = req.files;
      
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }

      // Validate file count (max 5 images)
      if (files.length > 5) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 5 images allowed per order'
        });
      }

      // Validate file types and sizes
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      for (const file of files) {
        if (!validTypes.includes(file.mimetype)) {
          return res.status(400).json({
            success: false,
            message: `Invalid file type: ${file.originalname}. Only JPEG, PNG, GIF, WebP are allowed`
          });
        }

        if (file.size > maxSize) {
          return res.status(400).json({
            success: false,
            message: `File too large: ${file.originalname}. Maximum size is 5MB`
          });
        }
      }

      // Upload images to S3
      const uploadResults = await s3UploadService.uploadMultipleImages(
        files, 
        'custom-order-images'
      );

      // Format response
      const imageUrls = uploadResults.map(result => ({
        url: result.url,
        key: result.key,
        filename: result.key.split('/').pop()
      }));

      logger.info('Custom order images uploaded successfully', {
        userId: req.user?.id,
        imageCount: imageUrls.length,
        imageKeys: imageUrls.map(img => img.key)
      });

      res.status(200).json({
        success: true,
        message: `${files.length} image(s) uploaded successfully`,
        data: {
          images: imageUrls,
          count: imageUrls.length
        }
      });

    } catch (error) {
      logger.error('Custom order images upload failed', {
        userId: req.user?.id,
        error: error.message,
        fileCount: req.files?.length || 0
      });
      
      res.status(500).json({
        success: false,
        message: 'Image upload failed: ' + error.message
      });
    }
  });

  /**
   * Upload single custom order image
   */
  uploadCustomOrderImage = asyncHandler(async (req, res) => {
    try {
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      // Validate file type and size
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!validTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: `Invalid file type. Only JPEG, PNG, GIF, WebP are allowed`
        });
      }

      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: `File too large. Maximum size is 5MB`
        });
      }

      // Upload image to S3
      const uploadResult = await s3UploadService.uploadImage(
        file.buffer,
        'custom-order-images',
        null,
        file.mimetype
      );

      const imageData = {
        url: uploadResult.url,
        key: uploadResult.key,
        filename: uploadResult.key.split('/').pop()
      };

      logger.info('Custom order image uploaded successfully', {
        userId: req.user?.id,
        imageKey: imageData.key
      });

      res.status(200).json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
          image: imageData
        }
      });

    } catch (error) {
      logger.error('Custom order image upload failed', {
        userId: req.user?.id,
        error: error.message
      });
      
      res.status(500).json({
        success: false,
        message: 'Image upload failed: ' + error.message
      });
    }
  });

  /**
   * Delete custom order images
   */
  deleteCustomOrderImages = asyncHandler(async (req, res) => {
    try {
      const { imageKeys } = req.body;

      if (!imageKeys || !Array.isArray(imageKeys) || imageKeys.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Image keys are required'
        });
      }

      // Delete images from S3
      await s3UploadService.deleteMultipleImages(imageKeys);

      logger.info('Custom order images deleted successfully', {
        userId: req.user?.id,
        deletedCount: imageKeys.length,
        imageKeys: imageKeys
      });

      res.status(200).json({
        success: true,
        message: `${imageKeys.length} image(s) deleted successfully`
      });

    } catch (error) {
      logger.error('Custom order images deletion failed', {
        userId: req.user?.id,
        error: error.message,
        imageKeys: req.body.imageKeys
      });
      
      res.status(500).json({
        success: false,
        message: 'Image deletion failed: ' + error.message
      });
    }
  });

  /**
   * Get custom order images (if needed for management)
   */
  getCustomOrderImages = asyncHandler(async (req, res) => {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Order ID is required'
        });
      }

      // Get images for specific order
      const images = await s3UploadService.getFolderImages(`custom-order-images/order-${orderId}`);

      res.status(200).json({
        success: true,
        data: {
          images: images,
          count: images.length
        }
      });

    } catch (error) {
      logger.error('Get custom order images failed', {
        orderId: req.params.orderId,
        error: error.message
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to get images: ' + error.message
      });
    }
  });
}

export default new UploadController();