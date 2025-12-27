import { contactService } from '../services/index.js';
import { asyncHandler } from '../utils/helpers.js';

// Get all contacts (Admin only)
export const getAllContacts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, userId } = req.query;
  
  const result = await contactService.getAllContacts({
    page: parseInt(page),
    limit: parseInt(limit),
    status,
    userId
  });
  
  res.status(200).json({
    success: true,
    data: result
  });
});

// Get contact by ID
export const getContactById = asyncHandler(async (req, res) => {
  const { contactId } = req.params;
  
  const contact = await contactService.getContactById(contactId);
  
  res.status(200).json({
    success: true,
    data: contact
  });
});

// Create contact (Public)
export const createContact = asyncHandler(async (req, res) => {
  const contactData = req.body;
  
  // Add user ID if user is authenticated
  if (req.user) {
    contactData.userId = req.user.id;
  }
  
  const contact = await contactService.createContact(contactData);
  
  res.status(201).json({
    success: true,
    message: 'Contact message sent successfully',
    data: contact
  });
});

export const updateContactStatus = asyncHandler(async (req, res) => {
  const { contactId } = req.params;
  const { status, adminNotes } = req.body;
  
  // Include adminNotes in the update
  const updatedContact = await contactService.updateContactStatus(contactId, {
    status,
    adminNotes
  });
  
  res.status(200).json({
    success: true,
    message: 'Contact status updated successfully',
    data: updatedContact
  });
});

// Update contact (Admin only)
export const updateContact = asyncHandler(async (req, res) => {
  const { contactId } = req.params;
  const updateData = req.body;
  
  const updatedContact = await contactService.updateContact(contactId, updateData);
  
  res.status(200).json({
    success: true,
    message: 'Contact updated successfully',
    data: updatedContact
  });
});

// Delete contact (Admin only)
export const deleteContact = asyncHandler(async (req, res) => {
  const { contactId } = req.params;
  
  await contactService.deleteContact(contactId);
  
  res.status(200).json({
    success: true,
    message: 'Contact deleted successfully'
  });
});

// Get contact statistics (Admin only)
export const getContactStats = asyncHandler(async (req, res) => {
  const stats = await contactService.getContactStats();
  
  res.status(200).json({
    success: true,
    data: stats
  });
});

// Get user's contacts
export const getUserContacts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const userId = req.user.id;
  
  const result = await contactService.getUserContacts(userId, {
    page: parseInt(page),
    limit: parseInt(limit),
    status
  });
  
  res.status(200).json({
    success: true,
    data: result
  });
});

// Bulk update contact status (Admin only)
export const bulkUpdateContactStatus = asyncHandler(async (req, res) => {
  const { contactIds, status } = req.body;
  
  if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Contact IDs array is required'
    });
  }
  
  if (!status) {
    return res.status(400).json({
      success: false,
      message: 'Status is required'
    });
  }
  
  const result = await contactService.bulkUpdateContactStatus(contactIds, status);
  
  res.status(200).json({
    success: true,
    message: `${result.count} contact(s) status updated successfully`,
    data: result
  });
});