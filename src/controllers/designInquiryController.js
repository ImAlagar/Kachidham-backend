import designInquiryService from '../services/designInquiryService.js';
import { asyncHandler } from '../utils/helpers.js';
import logger from '../utils/logger.js';

// Get all design inquiries (Admin)
export const getAllInquiries = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    status, 
    fabricSource,
    startDate,
    endDate,
    search 
  } = req.query;
  
  const result = await designInquiryService.getAllInquiries({
    page: parseInt(page),
    limit: parseInt(limit),
    status,
    fabricSource,
    startDate,
    endDate,
    search
  });
  
  res.status(200).json({
    success: true,
    data: result.inquiries,
    pagination: result.pagination
  });
});

// Get inquiry by ID
export const getInquiryById = asyncHandler(async (req, res) => {
  const { inquiryId } = req.params;
  
  const inquiry = await designInquiryService.getInquiryById(inquiryId);
  
  res.status(200).json({
    success: true,
    data: inquiry
  });
});

// Create new design inquiry (Public)
export const createInquiry = asyncHandler(async (req, res) => {
  const inquiryData = req.body;
  const file = req.file;
  
  // Get user ID from auth if logged in
  if (req.user) {
    inquiryData.userId = req.user.id;
  }
  
  const inquiry = await designInquiryService.createInquiry(inquiryData, file);
  
  res.status(201).json({
    success: true,
    message: 'Design inquiry submitted successfully',
    data: inquiry
  });
});

// Update inquiry status (Admin)
export const updateInquiryStatus = asyncHandler(async (req, res) => {
  const { inquiryId } = req.params;
  const updateData = req.body;
  
  const updatedInquiry = await designInquiryService.updateInquiryStatus(
    inquiryId, 
    updateData
  );
  
  res.status(200).json({
    success: true,
    message: 'Inquiry status updated successfully',
    data: updatedInquiry
  });
});

// Update inquiry (Admin)
export const updateInquiry = asyncHandler(async (req, res) => {
  const { inquiryId } = req.params;
  const updateData = req.body;
  const file = req.file;
  
  const updatedInquiry = await designInquiryService.updateInquiry(
    inquiryId, 
    updateData, 
    file
  );
  
  res.status(200).json({
    success: true,
    message: 'Inquiry updated successfully',
    data: updatedInquiry
  });
});

// Delete inquiry (Admin)
export const deleteInquiry = asyncHandler(async (req, res) => {
  const { inquiryId } = req.params;
  
  await designInquiryService.deleteInquiry(inquiryId);
  
  res.status(200).json({
    success: true,
    message: 'Inquiry deleted successfully'
  });
});

// Get inquiry statistics (Admin)
export const getInquiryStats = asyncHandler(async (req, res) => {
  const stats = await designInquiryService.getInquiryStats();
  
  res.status(200).json({
    success: true,
    data: stats
  });
});

// Get user's inquiries
export const getUserInquiries = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  
  const result = await designInquiryService.getUserInquiries(userId, {
    page: parseInt(page),
    limit: parseInt(limit)
  });
  
  res.status(200).json({
    success: true,
    data: result.inquiries,
    pagination: result.pagination
  });
});

// Get my inquiries (for logged in user)
export const getMyInquiries = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  
  const result = await designInquiryService.getUserInquiries(req.user.id, {
    page: parseInt(page),
    limit: parseInt(limit)
  });
  
  res.status(200).json({
    success: true,
    data: result.inquiries,
    pagination: result.pagination
  });
});