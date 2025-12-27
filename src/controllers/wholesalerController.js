// controllers/wholesalerController.js
import { asyncHandler } from '../utils/helpers.js';
import s3UploadService from '../services/s3UploadService.js';
import prisma from '../config/database.js';

export const uploadShopPhotos = asyncHandler(async (req, res) => {
  const { wholesalerId } = req.params;
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No files uploaded'
    });
  }

  // Check if wholesaler exists
  const wholesaler = await prisma.user.findFirst({
    where: {
      id: wholesalerId,
      role: 'WHOLESALER'
    },
    include: {
      wholesalerProfile: true
    }
  });

  if (!wholesaler) {
    return res.status(404).json({
      success: false,
      message: 'Wholesaler not found'
    });
  }

  // Upload photos to S3
  const uploadResults = await s3UploadService.uploadWholesalerShopPhotos(
    files, 
    wholesalerId, 
    wholesaler.wholesalerProfile.businessType
  );

  // Get URLs from upload results
  const newPhotoUrls = uploadResults.map(result => result.url);

  // Update wholesaler profile with new photos
  const updatedProfile = await prisma.wholesalerProfile.update({
    where: { userId: wholesalerId },
    data: {
      shopPhotos: {
        push: newPhotoUrls
      }
    }
  });

  res.status(200).json({
    success: true,
    message: `${files.length} shop photos uploaded successfully`,
    data: {
      uploadedPhotos: uploadResults,
      totalPhotos: updatedProfile.shopPhotos.length
    }
  });
});

export const getShopPhotos = asyncHandler(async (req, res) => {
  const { wholesalerId } = req.params;

  const photos = await s3UploadService.getWholesalerShopPhotos(wholesalerId);

  res.status(200).json({
    success: true,
    data: {
      photos,
      count: photos.length
    }
  });
});

export const deleteShopPhoto = asyncHandler(async (req, res) => {
  const { wholesalerId, photoKey } = req.params;

  // Delete from S3
  await s3UploadService.deleteWholesalerShopPhoto(wholesalerId, photoKey);

  // Remove from database array (you'll need to implement this logic)
  const profile = await prisma.wholesalerProfile.findFirst({
    where: { userId: wholesalerId }
  });

  if (profile) {
    const updatedPhotos = profile.shopPhotos.filter(photo => !photo.includes(photoKey));
    
    await prisma.wholesalerProfile.update({
      where: { userId: wholesalerId },
      data: {
        shopPhotos: updatedPhotos
      }
    });
  }

  res.status(200).json({
    success: true,
    message: 'Shop photo deleted successfully'
  });
});