import {
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand
} from '@aws-sdk/client-s3';
import { s3Client, S3_BUCKET_NAME } from '../config/s3.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

class s3UploadService {
  constructor() {
    this.s3Client = s3Client;
    this.bucketName = S3_BUCKET_NAME;
  }

  /**
   * Generic image upload method
   */
  async uploadImage(buffer, folderName = 'Garments', fileName = null, contentType = 'image/jpeg') {
    try {
      // If fileName is provided, use it as the full key
      // If not, generate key with folderName and random filename
      const key = fileName ? fileName : `${folderName}/${uuidv4()}-${Date.now()}.jpg`;
      
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        // Add ACL if needed (uncomment if you want public read)
        // ACL: 'public-read'
      });

      await this.s3Client.send(command);

      // Generate public URL
      const url = `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

      logger.info('Image uploaded successfully', {
        key,
        folder: folderName,
        contentType,
        url: url.split('?')[0] // Log without query params for cleanliness
      });

      return {
        url,
        key,
        folder: folderName
      };
    } catch (error) {
      logger.error('S3 image upload failed', {
        error: error.message,
        folderName,
        fileName,
        contentType
      });
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  /**
   * Upload multiple shop photos for wholesaler
   */
  async uploadWholesalerShopPhotos(files, wholesalerId, businessType) {
    try {
      if (!files || files.length === 0) {
        throw new Error('No files provided');
      }

      if (!wholesalerId) {
        throw new Error('Wholesaler ID is required');
      }

      if (!businessType) {
        throw new Error('Business type is required');
      }

      // Create folder path: wholesalers/{wholesalerId}/shop-photos/
      const folderPath = `wholesalers/${wholesalerId}/shop-photos`;
      
      const uploadPromises = files.map((file, index) => {
        const fileName = `${folderPath}/shop-photo-${index + 1}-${Date.now()}.${this.getFileExtension(file.mimetype)}`;
        return this.uploadImage(
          file.buffer, 
          '', // Don't use folder parameter since we're providing full fileName
          fileName,
          file.mimetype || 'image/jpeg'
        );
      });

      const results = await Promise.all(uploadPromises);
      
      logger.info('Wholesaler shop photos uploaded successfully', {
        wholesalerId,
        businessType,
        count: results.length,
        photos: results.map(result => result.key)
      });
      
      return results;
    } catch (error) {
      logger.error('Wholesaler shop photos upload failed', {
        wholesalerId,
        businessType,
        error: error.message,
        fileCount: files?.length || 0
      });
      throw new Error(`Shop photos upload failed: ${error.message}`);
    }
  }

  /**
   * Upload single wholesaler shop photo
   */
  async uploadWholesalerShopPhoto(file, wholesalerId) {
    try {
      if (!file || !wholesalerId) {
        throw new Error('File and wholesaler ID are required');
      }

      const folderPath = `wholesalers/${wholesalerId}/shop-photos`;
      const fileName = `${folderPath}/shop-photo-${Date.now()}.${this.getFileExtension(file.mimetype)}`;
      
      const result = await this.uploadImage(
        file.buffer, 
        '', // Don't use folder parameter
        fileName,
        file.mimetype || 'image/jpeg'
      );

      logger.info('Wholesaler shop photo uploaded', { 
        wholesalerId,
        photoKey: result.key 
      });
      return result;
    } catch (error) {
      logger.error('Wholesaler shop photo upload failed', {
        wholesalerId,
        error: error.message
      });
      throw new Error(`Shop photo upload failed: ${error.message}`);
    }
  }

  /**
   * Upload user avatar
   */
  async uploadUserAvatar(buffer, userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const fileName = `avatars/${userId}-${Date.now()}.jpg`;
      
      const result = await this.uploadImage(
        buffer, 
        '', // Don't use folder parameter
        fileName,
        'image/jpeg'
      );

      logger.info('User avatar uploaded', { userId });
      return result;
    } catch (error) {
      logger.error('User avatar upload failed', {
        userId,
        error: error.message
      });
      throw new Error(`Avatar upload failed: ${error.message}`);
    }
  }

  /**
   * Upload category image
   */
  async uploadCategoryImage(buffer, categoryId = null) {
    try {
      const fileName = categoryId ? 
        `categories/category-${categoryId}-${Date.now()}.jpg` :
        `categories/${uuidv4()}-${Date.now()}.jpg`;
      
      return await this.uploadImage(
        buffer, 
        'categories', 
        fileName
      );
    } catch (error) {
      logger.error('Category image upload failed', {
        categoryId,
        error: error.message
      });
      throw new Error(`Category image upload failed: ${error.message}`);
    }
  }

  /**
   * Upload product image
   */
  async uploadProductImage(buffer, productId = null) {
    try {
      const folderPath = productId ? 
        `products/${productId}` : 
        'products/general';
      
      const fileName = `${folderPath}/product-${Date.now()}-${uuidv4().slice(0, 8)}.jpg`;
      
      return await this.uploadImage(
        buffer, 
        '', // Don't use folder parameter
        fileName
      );
    } catch (error) {
      logger.error('Product image upload failed', {
        productId,
        error: error.message
      });
      throw new Error(`Product image upload failed: ${error.message}`);
    }
  }

  /**
   * Upload banner image
   */
  async uploadBannerImage(buffer, bannerId = null) {
    try {
      const fileName = bannerId ? 
        `banners/banner-${bannerId}-${Date.now()}.jpg` :
        `banners/${uuidv4()}-${Date.now()}.jpg`;
      
      return await this.uploadImage(
        buffer, 
        'banners', 
        fileName
      );
    } catch (error) {
      logger.error('Banner image upload failed', {
        bannerId,
        error: error.message
      });
      throw new Error(`Banner image upload failed: ${error.message}`);
    }
  }

  /**
   * Upload multiple images
   */
  async uploadMultipleImages(files, folderName = 'general') {
    try {
      if (!files || files.length === 0) {
        throw new Error('No files provided');
      }

      const uploadPromises = files.map(file => 
        this.uploadImage(
          file.buffer, 
          folderName,
          null,
          file.mimetype || 'image/jpeg'
        )
      );
      
      const results = await Promise.all(uploadPromises);
      
      logger.info('Multiple images uploaded', {
        folderName,
        count: results.length
      });
      
      return results;
    } catch (error) {
      logger.error('Multiple images upload failed', {
        folderName,
        fileCount: files?.length || 0,
        error: error.message
      });
      throw new Error('Multiple images upload failed');
    }
  }

  /**
   * Upload multiple product images
   */
  async uploadMultipleProductImages(files, productId = null) {
    try {
      if (!files || files.length === 0) {
        throw new Error('No files provided');
      }

      const uploadPromises = files.map(file => 
        this.uploadProductImage(file.buffer, productId)
      );
      
      const results = await Promise.all(uploadPromises);
      
      logger.info('Multiple product images uploaded', {
        productId,
        count: results.length
      });
      
      return results;
    } catch (error) {
      logger.error('Multiple product images upload failed', {
        productId,
        fileCount: files?.length || 0,
        error: error.message
      });
      throw new Error('Multiple product images upload failed');
    }
  }

  /**
   * Get all shop photos for a wholesaler
   */
  async getWholesalerShopPhotos(wholesalerId) {
    try {
      if (!wholesalerId) {
        throw new Error('Wholesaler ID is required');
      }

      const prefix = `wholesalers/${wholesalerId}/shop-photos/`;
      
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
        MaxKeys: 100
      });

      const result = await this.s3Client.send(command);
      
      const photos = result.Contents?.map(item => ({
        key: item.Key,
        url: `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${item.Key}`,
        lastModified: item.LastModified,
        size: item.Size,
        filename: item.Key.split('/').pop()
      })) || [];

      logger.debug('Fetched wholesaler shop photos', {
        wholesalerId,
        count: photos.length
      });

      return photos;
    } catch (error) {
      logger.error('Failed to fetch wholesaler shop photos', {
        wholesalerId,
        error: error.message
      });
      throw new Error('Failed to fetch shop photos');
    }
  }

  /**
   * Delete specific image by key
   */
  async deleteImage(key) {
    try {
      if (!key) {
        throw new Error('Image key is required');
      }

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      await this.s3Client.send(command);
      
      logger.info('Image deleted successfully', { key });
    } catch (error) {
      logger.error('S3 image deletion failed', {
        key,
        error: error.message
      });
      throw new Error('Image deletion failed');
    }
  }

  /**
   * Delete specific shop photo
   */
  async deleteWholesalerShopPhoto(wholesalerId, photoKey) {
    try {
      if (!wholesalerId || !photoKey) {
        throw new Error('Wholesaler ID and photo key are required');
      }

      await this.deleteImage(photoKey);
      
      logger.info('Wholesaler shop photo deleted', {
        wholesalerId,
        photoKey
      });
      
      return { success: true, message: 'Shop photo deleted successfully' };
    } catch (error) {
      logger.error('Failed to delete wholesaler shop photo', {
        wholesalerId,
        photoKey,
        error: error.message
      });
      throw new Error('Failed to delete shop photo');
    }
  }

  /**
   * Delete multiple images
   */
  async deleteMultipleImages(keys) {
    try {
      if (!keys || keys.length === 0) {
        logger.info('No images to delete');
        return { success: true, message: 'No images to delete', deletedCount: 0 };
      }

      // S3 DeleteObjectsCommand can only delete up to 1000 objects at once
      const batchSize = 1000;
      let totalDeleted = 0;

      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        
        const command = new DeleteObjectsCommand({
          Bucket: this.bucketName,
          Delete: {
            Objects: batch.map(key => ({ Key: key }))
          }
        });

        await this.s3Client.send(command);
        totalDeleted += batch.length;
      }

      logger.info('Multiple images deleted successfully', {
        deletedCount: totalDeleted,
        keys: keys.slice(0, 5) // Log first 5 keys for reference
      });

      return { 
        success: true, 
        message: `${totalDeleted} images deleted successfully`,
        deletedCount: totalDeleted 
      };
    } catch (error) {
      logger.error('S3 multiple images deletion failed', {
        keyCount: keys?.length || 0,
        error: error.message
      });
      throw new Error('Multiple images deletion failed');
    }
  }

  /**
   * Delete all wholesaler shop photos
   */
  async deleteAllWholesalerShopPhotos(wholesalerId) {
    try {
      if (!wholesalerId) {
        throw new Error('Wholesaler ID is required');
      }

      const photos = await this.getWholesalerShopPhotos(wholesalerId);
      
      if (photos.length > 0) {
        const deleteResult = await this.deleteMultipleImages(photos.map(photo => photo.key));
        
        logger.info('All wholesaler shop photos deleted', {
          wholesalerId,
          deletedCount: photos.length
        });
        
        return deleteResult;
      }
      
      logger.info('No shop photos found to delete', { wholesalerId });
      return { 
        success: true, 
        message: `No shop photos to delete for wholesaler ${wholesalerId}`,
        deletedCount: 0 
      };
    } catch (error) {
      logger.error('Failed to delete all wholesaler shop photos', {
        wholesalerId,
        error: error.message
      });
      throw new Error('Failed to delete all shop photos');
    }
  }

  /**
   * Get images in a folder
   */
  async getFolderImages(folderPath = 'general') {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: folderPath,
        MaxKeys: 1000
      });

      const result = await this.s3Client.send(command);
      
      const images = result.Contents?.map(item => ({
        key: item.Key,
        url: `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${item.Key}`,
        lastModified: item.LastModified,
        size: item.Size,
        filename: item.Key.split('/').pop()
      })) || [];

      logger.debug('Fetched folder images', {
        folderPath,
        count: images.length
      });

      return images;
    } catch (error) {
      logger.error('S3 folder images fetch failed', {
        folderPath,
        error: error.message
      });
      throw new Error('Failed to fetch folder images');
    }
  }

  /**
   * Get product images
   */
  async getProductImages(productId) {
    try {
      if (!productId) {
        throw new Error('Product ID is required');
      }

      const prefix = `products/${productId}`;
      const images = await this.getFolderImages(prefix);
      
      logger.debug('Fetched product images', {
        productId,
        count: images.length
      });
      
      return images;
    } catch (error) {
      logger.error('Product images fetch failed', {
        productId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Delete all product images
   */
  async deleteProductImages(productId) {
    try {
      if (!productId) {
        throw new Error('Product ID is required');
      }

      const images = await this.getProductImages(productId);
      
      if (images.length > 0) {
        await this.deleteMultipleImages(images.map(img => img.key));
        
        logger.info('All product images deleted', {
          productId,
          deletedCount: images.length
        });
      }
      
      return { deleted: images.length };
    } catch (error) {
      logger.error('Product images deletion failed', {
        productId,
        error: error.message
      });
      throw new Error('Failed to delete product images');
    }
  }

  /**
   * Organize product images (placeholder for future functionality)
   */
  async organizeProductImages(productId, imageData) {
    try {
      // For S3, we don't need to move files like Cloudinary
      // Images are already uploaded to correct location
      logger.info('Product images organized', {
        productId,
        imageCount: imageData?.length || 0
      });
    } catch (error) {
      logger.error('Product images organization failed', {
        productId,
        error: error.message
      });
      // Don't throw error as this is non-critical
    }
  }

  /**
   * Helper method to get file extension from mimetype
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

  /**
   * Generate pre-signed URL for temporary access
   */
  async generatePresignedUrl(key, expiresIn = 3600) {
    try {
      // Note: You'll need to import @aws-sdk/s3-request-presigner
      // and use getSignedUrl method for this functionality
      logger.warn('Presigned URL generation not implemented. Please implement using @aws-sdk/s3-request-presigner');
      return null;
    } catch (error) {
      logger.error('Presigned URL generation failed', {
        key,
        error: error.message
      });
      throw new Error('Failed to generate presigned URL');
    }
  }
}

export default new s3UploadService();