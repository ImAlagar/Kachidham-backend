// services/sliderService.js
import prisma from '../config/database.js';
import logger from '../utils/logger.js';

class SliderService {
  // Get all active sliders for home page
  async getActiveSliders() {
    const sliders = await prisma.homeSlider.findMany({
      where: {
        isActive: true,
        OR: [
          {
            startDate: null,
            endDate: null
          },
          {
            startDate: { lte: new Date() },
            endDate: { gte: new Date() }
          },
          {
            startDate: { lte: new Date() },
            endDate: null
          }
        ]
      },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' }
      ],
      select: {
        id: true,
        title: true,
        subtitle: true,
        description: true,
        smallText: true,
        offerText: true,
        buttonText: true,
        buttonLink: true,
        layout: true,
        bgImage: true,
        image: true,
        order: true
      }
    });

    return sliders;
  }

  // Get all sliders (Admin)
  async getAllSliders({ page = 1, limit = 10, isActive } = {}) {
    const skip = (page - 1) * limit;
    
    const where = {};
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    const [sliders, total] = await Promise.all([
      prisma.homeSlider.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: [
          { order: 'asc' },
          { createdAt: 'desc' }
        ]
      }),
      prisma.homeSlider.count({ where })
    ]);
    
    return {
      sliders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get slider by ID
  async getSliderById(sliderId) {
    const slider = await prisma.homeSlider.findUnique({
      where: { id: sliderId }
    });
    
    if (!slider) {
      throw new Error('Slider not found');
    }
    
    return slider;
  }

// Create slider
async createSlider(sliderData) {
  const {
    title,
    subtitle,
    description,
    smallText,
    offerText,
    buttonText,
    buttonLink,
    layout,
    bgImage, // OPTIONAL - can be null
    image,   // OPTIONAL - can be null
    imagePublicId, // OPTIONAL
    bgImagePublicId, // OPTIONAL
    isActive,
    order,
    startDate,
    endDate
  } = sliderData;

  // Validate required fields - only title is required now
  if (!title) {
    throw new Error('Title is required');
  }

  // Extract public IDs from URLs if provided but IDs are not
  let finalImagePublicId = imagePublicId;
  let finalBgImagePublicId = bgImagePublicId;

  if (image && !imagePublicId) {
    try {
      // Extract filename/ID from URL
      const url = new URL(image);
      const pathParts = url.pathname.split('/');
      finalImagePublicId = pathParts[pathParts.length - 1];
    } catch (error) {
      // If URL parsing fails, use the last part after slashes
      const parts = image.split('/');
      finalImagePublicId = parts[parts.length - 1];
    }
  }

  if (bgImage && !bgImagePublicId) {
    try {
      const url = new URL(bgImage);
      const pathParts = url.pathname.split('/');
      finalBgImagePublicId = pathParts[pathParts.length - 1];
    } catch (error) {
      const parts = bgImage.split('/');
      finalBgImagePublicId = parts[parts.length - 1];
    }
  }

  const slider = await prisma.homeSlider.create({
    data: {
      title,
      subtitle: subtitle || null,
      description: description || null,
      smallText: smallText || null,
      offerText: offerText || null,
      buttonText: buttonText || null,
      buttonLink: buttonLink || null,
      layout: layout || null,
      bgImage: bgImage || null,  // Can be null
      image: image || null,      // Can be null
      imagePublicId: finalImagePublicId || null,
      bgImagePublicId: finalBgImagePublicId || null,
      isActive: isActive !== undefined ? isActive : true,
      order: order || 0,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  logger.info(`Slider created: ${slider.id}`);
  return slider;
}

// Update slider
async updateSlider(sliderId, updateData) {
  // Check if slider exists
  const slider = await prisma.homeSlider.findUnique({
    where: { id: sliderId }
  });
  
  if (!slider) {
    throw new Error('Slider not found');
  }

  const {
    title,
    subtitle,
    description,
    smallText,
    offerText,
    buttonText,
    buttonLink,
    layout,
    bgImage,
    image,
    imagePublicId,
    bgImagePublicId,
    isActive,
    order,
    startDate,
    endDate,
    ...otherData
  } = updateData;

  // Prepare update data
  const dataToUpdate = {};

  // Handle title
  if (title !== undefined) {
    if (!title.trim()) {
      throw new Error('Title cannot be empty');
    }
    dataToUpdate.title = title;
  }

  // Handle text fields - can set to null
  if (subtitle !== undefined) dataToUpdate.subtitle = subtitle || null;
  if (description !== undefined) dataToUpdate.description = description || null;
  if (smallText !== undefined) dataToUpdate.smallText = smallText || null;
  if (offerText !== undefined) dataToUpdate.offerText = offerText || null;
  if (buttonText !== undefined) dataToUpdate.buttonText = buttonText || null;
  if (buttonLink !== undefined) dataToUpdate.buttonLink = buttonLink || null;
  
  // Handle layout
  if (layout !== undefined) dataToUpdate.layout = layout || null;
  
  // Handle boolean fields
  if (isActive !== undefined) dataToUpdate.isActive = isActive;
  
  // Handle numeric fields
  if (order !== undefined) dataToUpdate.order = order || 0;
  
  // Handle dates
  if (startDate !== undefined) dataToUpdate.startDate = startDate ? new Date(startDate) : null;
  if (endDate !== undefined) dataToUpdate.endDate = endDate ? new Date(endDate) : null;

  // Handle background image - can set to null
  if (bgImage !== undefined) {
    dataToUpdate.bgImage = bgImage || null;
    
    // Handle bgImagePublicId
    if (bgImagePublicId !== undefined) {
      dataToUpdate.bgImagePublicId = bgImagePublicId || null;
    } else if (bgImage) {
      // Extract public ID from URL if not provided
      try {
        const url = new URL(bgImage);
        const pathParts = url.pathname.split('/');
        dataToUpdate.bgImagePublicId = pathParts[pathParts.length - 1];
      } catch (error) {
        const parts = bgImage.split('/');
        dataToUpdate.bgImagePublicId = parts[parts.length - 1];
      }
    } else {
      dataToUpdate.bgImagePublicId = null;
    }
  }

  // Handle main image - can set to null
  if (image !== undefined) {
    dataToUpdate.image = image || null;
    
    // Handle imagePublicId
    if (imagePublicId !== undefined) {
      dataToUpdate.imagePublicId = imagePublicId || null;
    } else if (image) {
      // Extract public ID from URL if not provided
      try {
        const url = new URL(image);
        const pathParts = url.pathname.split('/');
        dataToUpdate.imagePublicId = pathParts[pathParts.length - 1];
      } catch (error) {
        const parts = image.split('/');
        dataToUpdate.imagePublicId = parts[parts.length - 1];
      }
    } else {
      dataToUpdate.imagePublicId = null;
    }
  }

  // Add updatedAt timestamp
  dataToUpdate.updatedAt = new Date();

  const updatedSlider = await prisma.homeSlider.update({
    where: { id: sliderId },
    data: dataToUpdate
  });

  logger.info(`Slider updated: ${sliderId}`);
  return updatedSlider;
}
  // Delete slider
  async deleteSlider(sliderId) {
    const slider = await prisma.homeSlider.findUnique({
      where: { id: sliderId }
    });
    
    if (!slider) {
      throw new Error('Slider not found');
    }

    await prisma.homeSlider.delete({
      where: { id: sliderId }
    });

    logger.info(`Slider deleted: ${sliderId}`);
  }

  // Toggle slider active status
  async toggleSliderStatus(sliderId, isActive) {
    const slider = await prisma.homeSlider.findUnique({
      where: { id: sliderId }
    });
    
    if (!slider) {
      throw new Error('Slider not found');
    }

    const updatedSlider = await prisma.homeSlider.update({
      where: { id: sliderId },
      data: {
        isActive: isActive === true || isActive === 'true',
        updatedAt: new Date()
      }
    });

    logger.info(`Slider status updated: ${sliderId} -> ${updatedSlider.isActive}`);
    return updatedSlider;
  }

  // Reorder sliders
  async reorderSliders(sliderOrders) {
    if (!Array.isArray(sliderOrders) || sliderOrders.length === 0) {
      throw new Error('Slider orders array is required');
    }

    const transactions = sliderOrders.map(({ id, order }) =>
      prisma.homeSlider.update({
        where: { id },
        data: { order: parseInt(order) }
      })
    );

    const results = await prisma.$transaction(transactions);
    logger.info(`Sliders reordered: ${sliderOrders.length} items`);
    
    return results;
  }


async getSliderStats() {
  const currentDate = new Date();

  try {
    // Get total sliders count
    const totalSliders = await prisma.homeSlider.count();

    // Get active sliders (isActive = true and within validity period if dates exist)
    const activeSliders = await prisma.homeSlider.count({
      where: {
        isActive: true,
        OR: [
          {
            startDate: null,
            endDate: null
          },
          {
            startDate: { lte: currentDate },
            endDate: { gte: currentDate }
          },
          {
            startDate: { lte: currentDate },
            endDate: null
          }
        ]
      }
    });

    // Get inactive sliders
    const inactiveSliders = await prisma.homeSlider.count({
      where: {
        isActive: false
      }
    });

    // Get expired sliders (endDate is in the past)
    const expiredSliders = await prisma.homeSlider.count({
      where: {
        endDate: { lt: currentDate },
        isActive: true
      }
    });

    // Get scheduled sliders (startDate is in the future)
    const scheduledSliders = await prisma.homeSlider.count({
      where: {
        startDate: { gt: currentDate },
        isActive: true
      }
    });

    // Get sliders by layout type
    const slidersByLayout = await prisma.homeSlider.groupBy({
      by: ['layout'],
      _count: {
        id: true
      }
    });

    // Get sliders with button actions
    const slidersWithButtons = await prisma.homeSlider.count({
      where: {
        AND: [
          { buttonText: { not: null } },
          { buttonLink: { not: null } }
        ]
      }
    });

    // Get recent sliders (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const recentSliders = await prisma.homeSlider.count({
      where: {
        createdAt: { gte: weekAgo }
      }
    });

    // Get sliders with offer text
    const slidersWithOffers = await prisma.homeSlider.count({
      where: {
        offerText: { not: null }
      }
    });

    // Get top ordered sliders (by order field)
    const topOrderedSliders = await prisma.homeSlider.findMany({
      take: 5,
      orderBy: { order: 'asc' },
      select: {
        id: true,
        title: true,
        order: true,
        isActive: true
      }
    });

    // FIXED: Get sliders without images - using separate queries
    // First get all sliders and check for missing images manually
    const allSliders = await prisma.homeSlider.findMany({
      select: {
        id: true,
        bgImage: true,
        image: true
      }
    });

    // Calculate missing image counts manually
    let slidersWithoutBgImageCount = 0;
    let slidersWithoutImageCount = 0;
    let slidersWithoutAnyImages = 0;

    allSliders.forEach(slider => {
      const hasBgImage = slider.bgImage && slider.bgImage.trim() !== '';
      const hasImage = slider.image && slider.image.trim() !== '';

      if (!hasBgImage) slidersWithoutBgImageCount++;
      if (!hasImage) slidersWithoutImageCount++;
      if (!hasBgImage && !hasImage) slidersWithoutAnyImages++;
    });

    return {
      totalSliders,
      activeSliders,
      inactiveSliders,
      expiredSliders,
      scheduledSliders,
      slidersByLayout: slidersByLayout.reduce((acc, item) => {
        acc[item.layout] = item._count.id;
        return acc;
      }, {}),
      slidersWithButtons,
      slidersWithOffers,
      recentSliders,
      topOrderedSliders,
      slidersWithoutBgImage: slidersWithoutBgImageCount,
      slidersWithoutImage: slidersWithoutImageCount,
      slidersWithoutAnyImages,
      // Summary stats
      summary: {
        activePercentage: totalSliders > 0 ? Math.round((activeSliders / totalSliders) * 100) : 0,
        withButtonsPercentage: totalSliders > 0 ? Math.round((slidersWithButtons / totalSliders) * 100) : 0,
        recentPercentage: totalSliders > 0 ? Math.round((recentSliders / totalSliders) * 100) : 0,
        imagesMissingPercentage: totalSliders > 0 ? Math.round((slidersWithoutAnyImages / totalSliders) * 100) : 0
      }
    };
  } catch (error) {
    console.error('Error in getSliderStats:', error);
    throw error;
  }
}
  // Get slider performance metrics (if you want to track views/clicks later)
  async getSliderPerformance() {
    // This can be extended later when you add analytics tracking
    const currentDate = new Date();
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    // Placeholder for future analytics implementation
    const monthlySliders = await prisma.homeSlider.count({
      where: {
        createdAt: { gte: monthAgo }
      }
    });

    return {
      monthlySliders,
      // Add more metrics as needed
      _note: "Analytics tracking can be added later for views and clicks"
    };
  }
}

export default new SliderService();