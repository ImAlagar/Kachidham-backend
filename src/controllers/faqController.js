import { faqService } from '../services/index.js';
import { asyncHandler } from '../utils/helpers.js';

// Get all FAQs
export const getAllFaqs = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    isActive, 
    category, 
    search 
  } = req.query;
  
  const result = await faqService.getAllFaqs({
    page: parseInt(page),
    limit: parseInt(limit),
    isActive,
    category,
    search
  });
  
  res.status(200).json({
    success: true,
    data: result.faqs,
    pagination: result.pagination
  });
});

// Get active FAQs by category (public)
export const getActiveFaqsByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;
  
  const faqs = await faqService.getActiveFaqsByCategory(category);
  
  res.status(200).json({
    success: true,
    data: faqs
  });
});

// Get FAQ by ID
export const getFaqById = asyncHandler(async (req, res) => {
  const { faqId } = req.params;
  
  const faq = await faqService.getFaqById(faqId);
  
  res.status(200).json({
    success: true,
    data: faq
  });
});

// Create FAQ (Admin only)
export const createFaq = asyncHandler(async (req, res) => {
  const faqData = req.body;
  
  const faq = await faqService.createFaq(faqData);
  
  res.status(201).json({
    success: true,
    message: 'FAQ created successfully',
    data: faq
  });
});

// Update FAQ (Admin only)
export const updateFaq = asyncHandler(async (req, res) => {
  const { faqId } = req.params;
  const updateData = req.body;
  
  const updatedFaq = await faqService.updateFaq(faqId, updateData);
  
  res.status(200).json({
    success: true,
    message: 'FAQ updated successfully',
    data: updatedFaq
  });
});

// Delete FAQ (Admin only)
export const deleteFaq = asyncHandler(async (req, res) => {
  const { faqId } = req.params;
  
  await faqService.deleteFaq(faqId);
  
  res.status(200).json({
    success: true,
    message: 'FAQ deleted successfully'
  });
});

// Toggle FAQ status (Admin only)
export const toggleFaqStatus = asyncHandler(async (req, res) => {
  const { faqId } = req.params;
  const { isActive } = req.body;
  
  const updatedFaq = await faqService.toggleFaqStatus(faqId, isActive);
  
  res.status(200).json({
    success: true,
    message: `FAQ ${isActive ? 'activated' : 'deactivated'} successfully`,
    data: updatedFaq
  });
});

// Update FAQ order (Admin only)
export const updateFaqOrder = asyncHandler(async (req, res) => {
  const { faqId } = req.params;
  const { order } = req.body;
  
  if (order === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Order value is required'
    });
  }
  
  const updatedFaq = await faqService.updateFaqOrder(faqId, parseInt(order));
  
  res.status(200).json({
    success: true,
    message: 'FAQ order updated successfully',
    data: updatedFaq
  });
});

// Get FAQ statistics (Admin only)
export const getFaqStats = asyncHandler(async (req, res) => {
  const stats = await faqService.getFaqStats();
  
  res.status(200).json({
    success: true,
    data: stats
  });
});

// Bulk update FAQ order (Admin only)
export const bulkUpdateFaqOrder = asyncHandler(async (req, res) => {
  const { faqs } = req.body;
  
  if (!Array.isArray(faqs) || faqs.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'FAQ list is required'
    });
  }
  
  const updatedFaqs = await faqService.bulkUpdateFaqOrder(faqs);
  
  res.status(200).json({
    success: true,
    message: 'FAQ orders updated successfully',
    data: updatedFaqs
  });
});

// Get FAQ categories
export const getFaqCategories = asyncHandler(async (req, res) => {
  const categories = await faqService.getFaqCategories();
  
  res.status(200).json({
    success: true,
    data: categories
  });
});