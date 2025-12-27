// controllers/sliderController.js
import { sliderService } from '../services/index.js';
import s3SliderService from '../services/s3SliderService.js';
import { asyncHandler } from '../utils/helpers.js';

// Get active sliders for home page (Public)
export const getActiveSliders = asyncHandler(async (req, res) => {
  const sliders = await sliderService.getActiveSliders();
  
  res.status(200).json({
    success: true,
    data: sliders
  });
});

// Get all sliders (Admin only)
export const getAllSliders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, isActive } = req.query;
  
  const result = await sliderService.getAllSliders({
    page: parseInt(page),
    limit: parseInt(limit),
    isActive
  });
  
  res.status(200).json({
    success: true,
    data: result
  });
});

// Get slider by ID
export const getSliderById = asyncHandler(async (req, res) => {
  const { sliderId } = req.params;
  
  const slider = await sliderService.getSliderById(sliderId);
  
  res.status(200).json({
    success: true,
    data: slider
  });
});

export const createSlider = asyncHandler(async (req, res) => {
  // Extract data from req.body
  const sliderData = {
    title: req.body.title,
    subtitle: req.body.subtitle || null,
    description: req.body.description || null,
    smallText: req.body.smallText || null,
    offerText: req.body.offerText || null,
    buttonText: req.body.buttonText || null,
    buttonLink: req.body.buttonLink || null,
    layout: req.body.layout || 'left',
    order: req.body.order ? parseInt(req.body.order) : 0,
    isActive: req.body.isActive !== undefined ? req.body.isActive : true,
    startDate: req.body.startDate || null,
    endDate: req.body.endDate || null,
    bgImage: null, // Initialize as null
    bgImagePublicId: null,
    image: null, // Initialize as null
    imagePublicId: null
  };

  try {
    // Upload images to S3 if provided
    if (req.files?.bgImage?.[0]) {
      const bgImageResult = await s3SliderService.uploadSliderBgImage(
        req.files.bgImage[0]
      );
      sliderData.bgImage = bgImageResult.url;
      sliderData.bgImagePublicId = bgImageResult.key;
    }

    if (req.files?.image?.[0]) {
      const mainImageResult = await s3SliderService.uploadSliderMainImage(
        req.files.image[0]
      );
      sliderData.image = mainImageResult.url;
      sliderData.imagePublicId = mainImageResult.key;
    }

    // Create slider in database (images can be null)
    const slider = await sliderService.createSlider(sliderData);
    
    res.status(201).json({
      success: true,
      message: 'Slider created successfully',
      data: slider
    });
  } catch (uploadError) {
    console.error('S3 upload failed:', uploadError);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload images to cloud storage'
    });
  }
});

// Update slider (Admin only)
export const updateSlider = asyncHandler(async (req, res) => {
  const { sliderId } = req.params;
  
  const updateData = {
    ...req.body,
    // Parse dates if provided
    ...(req.body.startDate && { startDate: new Date(req.body.startDate) }),
    ...(req.body.endDate && { endDate: new Date(req.body.endDate) })
  };

  // Handle uploaded files
  if (req.files) {
    try {
      // Upload new background image if provided
      if (req.files.bgImage?.[0]) {
        const bgImageResult = await s3SliderService.uploadSliderBgImage(
          req.files.bgImage[0],
          sliderId
        );
        updateData.bgImage = bgImageResult.url;
        updateData.bgImagePublicId = bgImageResult.key;
      }
      // If bgImage is empty string, set to null (remove image)
      else if (req.body.bgImage === '') {
        updateData.bgImage = null;
        updateData.bgImagePublicId = null;
      }

      // Upload new main image if provided
      if (req.files.image?.[0]) {
        const mainImageResult = await s3SliderService.uploadSliderMainImage(
          req.files.image[0],
          sliderId
        );
        updateData.image = mainImageResult.url;
        updateData.imagePublicId = mainImageResult.key;
      }
      // If image is empty string, set to null (remove image)
      else if (req.body.image === '') {
        updateData.image = null;
        updateData.imagePublicId = null;
      }
    } catch (uploadError) {
      console.error('S3 upload failed during update:', uploadError);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload images to cloud storage'
      });
    }
  }

  const updatedSlider = await sliderService.updateSlider(sliderId, updateData);
  
  res.status(200).json({
    success: true,
    message: 'Slider updated successfully',
    data: updatedSlider
  });
});

// Delete slider (Admin only)
export const deleteSlider = asyncHandler(async (req, res) => {
  const { sliderId } = req.params;
  
  try {
    // First delete images from S3
    await s3SliderService.deleteSliderImages(sliderId);
    
    // Then delete slider from database
    await sliderService.deleteSlider(sliderId);
    
    res.status(200).json({
      success: true,
      message: 'Slider deleted successfully'
    });
  } catch (error) {
    console.error('Slider deletion failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete slider'
    });
  }
});

// Toggle slider status (Admin only)
export const toggleSliderStatus = asyncHandler(async (req, res) => {
  const { sliderId } = req.params;
  const { isActive } = req.body;
  
  const updatedSlider = await sliderService.toggleSliderStatus(sliderId, isActive);
  
  res.status(200).json({
    success: true,
    message: `Slider ${isActive ? 'activated' : 'deactivated'} successfully`,
    data: updatedSlider
  });
});

// Reorder sliders (Admin only)
export const reorderSliders = asyncHandler(async (req, res) => {
  const { sliderOrders } = req.body;
  
  if (!sliderOrders || !Array.isArray(sliderOrders)) {
    return res.status(400).json({
      success: false,
      message: 'Slider orders array is required'
    });
  }
  
  const results = await sliderService.reorderSliders(sliderOrders);
  
  res.status(200).json({
    success: true,
    message: 'Sliders reordered successfully',
    data: results
  });
});

// Get slider statistics (Admin only)
export const getSliderStats = asyncHandler(async (req, res) => {
  const stats = await sliderService.getSliderStats();
  
  res.status(200).json({
    success: true,
    data: stats
  });
});

// Get slider performance metrics (Admin only)
export const getSliderPerformance = asyncHandler(async (req, res) => {
  const performance = await sliderService.getSliderPerformance();
  
  res.status(200).json({
    success: true,
    data: performance
  });
});