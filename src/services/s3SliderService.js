// services/s3SliderService.js
import s3UploadService from './s3UploadService.js';
import { v4 as uuidv4 } from 'uuid';

class S3SliderService {
  /**
   * Upload slider background image
   */
  async uploadSliderBgImage(file, sliderId = null) {
    try {
      if (!file) {
        throw new Error('Background image file is required');
      }

      const fileName = sliderId ? 
        `sliders/${sliderId}/bg-image-${Date.now()}.${this.getFileExtension(file.mimetype)}` :
        `sliders/temp/bg-image-${Date.now()}-${uuidv4().slice(0, 8)}.${this.getFileExtension(file.mimetype)}`;
      
      const result = await s3UploadService.uploadImage(
        file.buffer, 
        '', // Don't use folder parameter since we're providing full fileName
        fileName,
        file.mimetype || 'image/jpeg'
      );

      return result;
    } catch (error) {
      console.error('Slider background image upload failed:', error);
      throw new Error(`Background image upload failed: ${error.message}`);
    }
  }

  /**
   * Upload slider main image
   */
  async uploadSliderMainImage(file, sliderId = null) {
    try {
      if (!file) {
        throw new Error('Main image file is required');
      }

      const fileName = sliderId ? 
        `sliders/${sliderId}/main-image-${Date.now()}.${this.getFileExtension(file.mimetype)}` :
        `sliders/temp/main-image-${Date.now()}-${uuidv4().slice(0, 8)}.${this.getFileExtension(file.mimetype)}`;
      
      const result = await s3UploadService.uploadImage(
        file.buffer, 
        '', // Don't use folder parameter
        fileName,
        file.mimetype || 'image/jpeg'
      );

      return result;
    } catch (error) {
      console.error('Slider main image upload failed:', error);
      throw new Error(`Main image upload failed: ${error.message}`);
    }
  }

  /**
   * Upload both slider images
   */
  async uploadSliderImages(bgImageFile, mainImageFile, sliderId = null) {
    try {
      const [bgImageResult, mainImageResult] = await Promise.all([
        this.uploadSliderBgImage(bgImageFile, sliderId),
        this.uploadSliderMainImage(mainImageFile, sliderId)
      ]);

      return {
        bgImage: bgImageResult,
        mainImage: mainImageResult
      };
    } catch (error) {
      console.error('Slider images upload failed:', error);
      throw new Error(`Slider images upload failed: ${error.message}`);
    }
  }

  /**
   * Delete slider images from S3
   */
  async deleteSliderImages(sliderId) {
    try {
      if (!sliderId) {
        throw new Error('Slider ID is required');
      }

      const prefix = `sliders/${sliderId}/`;
      const images = await s3UploadService.getFolderImages(prefix);
      
      if (images.length > 0) {
        await s3UploadService.deleteMultipleImages(images.map(img => img.key));
      }

      return { deleted: images.length };
    } catch (error) {
      console.error('Slider images deletion failed:', error);
      throw new Error(`Slider images deletion failed: ${error.message}`);
    }
  }

  /**
   * Delete specific slider image by key
   */
  async deleteSliderImageByKey(key) {
    try {
      await s3UploadService.deleteImage(key);
    } catch (error) {
      console.error('Slider image deletion failed:', error);
      throw new Error(`Slider image deletion failed: ${error.message}`);
    }
  }

  /**
   * Helper method to get file extension
   */
  getFileExtension(mimetype) {
    const extensions = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif'
    };
    
    return extensions[mimetype] || 'jpg';
  }
}

export default new S3SliderService();