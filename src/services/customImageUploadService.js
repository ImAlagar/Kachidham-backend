// services/customImageUploadService.js
import s3UploadService from './s3UploadService.js';
import logger from '../utils/logger.js';

class CustomImageUploadService {
  
  /**
   * Upload custom order images to S3
   */
  async uploadCustomOrderImages(files, userId, orderId = null) {
    try {
      if (!files || files.length === 0) {
        return [];
      }

      // Validate files
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB per file

      const validFiles = [];
      const invalidFiles = [];

      files.forEach(file => {
        if (!validTypes.includes(file.type)) {
          invalidFiles.push(`${file.name} - Invalid file type`);
        } else if (file.size > maxSize) {
          invalidFiles.push(`${file.name} - File too large (max 5MB)`);
        } else {
          validFiles.push(file);
        }
      });

      // Show errors for invalid files
      if (invalidFiles.length > 0) {
        logger.warn('Invalid files detected during custom image upload', {
          userId,
          invalidFiles
        });
      }

      if (validFiles.length === 0) {
        return [];
      }

      // Create folder path for custom order images
      const folderPath = orderId 
        ? `custom-orders/${orderId}`
        : `custom-orders/temp/${userId}`;

      // Upload files to S3
      const uploadResults = await s3UploadService.uploadMultipleImages(
        validFiles,
        folderPath
      );

      // Format response
      const uploadedImages = uploadResults.map((result, index) => ({
        url: result.url,
        key: result.key,
        filename: validFiles[index].name || `custom-image-${Date.now()}-${index}.jpg`,
        size: validFiles[index].size,
        uploadedAt: new Date()
      }));

      logger.info('Custom order images uploaded successfully', {
        userId,
        orderId,
        imageCount: uploadedImages.length,
        folderPath
      });

      return uploadedImages;

    } catch (error) {
      logger.error('Custom order images upload failed', {
        userId,
        orderId,
        error: error.message,
        fileCount: files?.length || 0
      });
      throw new Error(`Failed to upload custom images: ${error.message}`);
    }
  }

  /**
   * Upload single custom order image
   */
  async uploadCustomOrderImage(file, userId, orderId = null) {
    try {
      if (!file) {
        throw new Error('File is required');
      }

      // Validate file
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!validTypes.includes(file.type)) {
        throw new Error('Invalid file type. Only JPEG, PNG, GIF, WebP are allowed');
      }

      if (file.size > maxSize) {
        throw new Error('File too large. Maximum size is 5MB');
      }

      // Create folder path
      const folderPath = orderId 
        ? `custom-orders/${orderId}`
        : `custom-orders/temp/${userId}`;

      // Upload file to S3
      const uploadResult = await s3UploadService.uploadImage(
        file.buffer,
        folderPath,
        null,
        file.mimetype
      );

      const uploadedImage = {
        url: uploadResult.url,
        key: uploadResult.key,
        filename: file.name || `custom-image-${Date.now()}.jpg`,
        size: file.size,
        uploadedAt: new Date()
      };

      logger.info('Custom order image uploaded successfully', {
        userId,
        orderId,
        imageKey: uploadedImage.key
      });

      return uploadedImage;

    } catch (error) {
      logger.error('Custom order image upload failed', {
        userId,
        orderId,
        error: error.message
      });
      throw new Error(`Failed to upload custom image: ${error.message}`);
    }
  }

  /**
   * Delete custom order images from S3
   */
  async deleteCustomOrderImages(imageKeys) {
    try {
      if (!imageKeys || imageKeys.length === 0) {
        return { success: true, message: 'No images to delete', deletedCount: 0 };
      }

      await s3UploadService.deleteMultipleImages(imageKeys);

      logger.info('Custom order images deleted from S3', {
        deletedCount: imageKeys.length,
        imageKeys: imageKeys.slice(0, 5) // Log first 5 keys
      });

      return {
        success: true,
        message: `${imageKeys.length} custom image(s) deleted successfully`,
        deletedCount: imageKeys.length
      };

    } catch (error) {
      logger.error('Custom order images deletion failed', {
        error: error.message,
        imageKeysCount: imageKeys?.length || 0
      });
      throw new Error(`Failed to delete custom images: ${error.message}`);
    }
  }

  /**
   * Get custom order images for an order
   */
  async getCustomOrderImages(orderId) {
    try {
      if (!orderId) {
        throw new Error('Order ID is required');
      }

      const folderPath = `custom-orders/${orderId}`;
      const images = await s3UploadService.getFolderImages(folderPath);

      logger.debug('Fetched custom order images', {
        orderId,
        count: images.length
      });

      return images;

    } catch (error) {
      logger.error('Failed to fetch custom order images', {
        orderId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Process custom images from frontend and upload to S3
   * This is the main method used by OrderService
   */
  async processCustomImagesForOrder(customImagesData, userId, orderId = null) {
    try {
      if (!customImagesData || customImagesData.length === 0) {
        return [];
      }

      // Convert base64/dataURL images to buffers and upload
      const filesToUpload = [];
      
      for (const imageData of customImagesData) {
        if (imageData.file) {
          // If it's a File object (from frontend)
          filesToUpload.push(imageData.file);
        } else if (imageData.buffer) {
          // If it's already a buffer
          filesToUpload.push({
            buffer: imageData.buffer,
            mimetype: imageData.mimetype || 'image/jpeg',
            name: imageData.filename || `custom-image-${Date.now()}.jpg`
          });
        } else if (imageData.url && imageData.url.startsWith('data:')) {
          // If it's a data URL (base64)
          try {
            const file = await this.dataURLToFile(imageData.url, imageData.filename);
            filesToUpload.push(file);
          } catch (error) {
            logger.warn('Failed to convert data URL to file', {
              error: error.message
            });
          }
        }
      }

      if (filesToUpload.length === 0) {
        return [];
      }

      // Upload to S3
      const uploadedImages = await this.uploadCustomOrderImages(filesToUpload, userId, orderId);

      return uploadedImages;

    } catch (error) {
      logger.error('Custom images processing failed', {
        userId,
        orderId,
        error: error.message,
        imageCount: customImagesData?.length || 0
      });
      throw new Error(`Failed to process custom images: ${error.message}`);
    }
  }

  /**
   * Convert data URL to File object
   */
  async dataURLToFile(dataURL, filename = 'custom-image.jpg') {
    try {
      const response = await fetch(dataURL);
      const blob = await response.blob();
      return new File([blob], filename, { type: blob.type });
    } catch (error) {
      throw new Error(`Failed to convert data URL to file: ${error.message}`);
    }
  }

  /**
   * Clean up temporary custom images
   */
  async cleanupTempCustomImages(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const tempFolderPath = `custom-orders/temp/${userId}`;
      const tempImages = await s3UploadService.getFolderImages(tempFolderPath);

      if (tempImages.length > 0) {
        await s3UploadService.deleteMultipleImages(tempImages.map(img => img.key));
        
        logger.info('Temporary custom images cleaned up', {
          userId,
          deletedCount: tempImages.length
        });
      }

      return { deleted: tempImages.length };

    } catch (error) {
      logger.error('Temporary custom images cleanup failed', {
        userId,
        error: error.message
      });
      // Don't throw error as this is non-critical cleanup
    }
  }
}

export default new CustomImageUploadService();