// controllers/designController.js - FIXED VERSION
import { designService } from '../services/index.js';
import { asyncHandler } from '../utils/helpers.js';
import logger from '../utils/logger.js';

// Create design
export const createDesign = asyncHandler(async (req, res) => {

  const designData = req.body;
  const userId = req.user?.id;
  
  // FIX: Safe cookie access with fallback
  const sessionId = req.cookies?.sessionId || 
                   req.cookies?.connect.sid || 
                   req.headers['x-session-id'] || 
                   `anon_${Date.now()}`;
  

  
  try {
    const design = await designService.createDesign(designData, userId, sessionId);
    
    res.status(201).json({
      success: true,
      message: 'Design created successfully',
      data: design
    });
  } catch (error) {
    console.error('❌ DESIGN CREATION FAILED:', error);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create design',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get design by ID
export const getDesignById = asyncHandler(async (req, res) => {
  const { designId } = req.params;
  const userId = req.user?.id;
  const sessionId = req.cookies?.sessionId || req.cookies?.connect.sid;

  const design = await designService.getDesignById(designId, userId, sessionId);
  
  res.status(200).json({
    success: true,
    data: design
  });
});

// Get user designs
export const getUserDesigns = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const sessionId = req.cookies?.sessionId || req.cookies?.connect.sid;
  const { status } = req.query;
  
  const designs = await designService.getUserDesigns(userId, sessionId, status);
  
  res.status(200).json({
    success: true,
    data: designs
  });
});

// Update design
export const updateDesign = asyncHandler(async (req, res) => {
  const { designId } = req.params;
  const updateData = req.body;
  const userId = req.user?.id;
  const sessionId = req.cookies?.sessionId || req.cookies?.connect.sid;
  
  const updatedDesign = await designService.updateDesign(
    designId, 
    updateData, 
    userId, 
    sessionId
  );
  
  res.status(200).json({
    success: true,
    message: 'Design updated successfully',
    data: updatedDesign
  });
});

// Delete design
export const deleteDesign = asyncHandler(async (req, res) => {
  const { designId } = req.params;
  const userId = req.user?.id;
  const sessionId = req.cookies?.sessionId || req.cookies?.connect.sid;
  
  await designService.deleteDesign(designId, userId, sessionId);
  
  res.status(200).json({
    success: true,
    message: 'Design deleted successfully'
  });
});

// Generate design preview
export const generateDesignPreview = asyncHandler(async (req, res) => {
  const { designId } = req.params;
  const { width = 800, height = 600 } = req.query;
  
  const previewData = await designService.generateDesignPreview(designId, parseInt(width), parseInt(height));
  
  res.status(200).json({
    success: true,
    data: previewData
  });
});