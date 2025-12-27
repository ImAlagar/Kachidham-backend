import express from 'express';
import {
  getAllContacts,
  getContactById,
  createContact,
  updateContactStatus,
  updateContact,
  deleteContact,
  getContactStats,
  getUserContacts,
  bulkUpdateContactStatus
} from '../controllers/contactController.js';
import { auth, authorize } from '../middleware/auth.js';
import { validateContact } from '../middleware/validation.js';

const router = express.Router();

// Public routes
router.post('/', validateContact, createContact);

// User routes (authenticated users)
router.get('/user/my-contacts', auth, getUserContacts);

// Admin only routes
router.get('/admin', auth, authorize('ADMIN'), getAllContacts);
router.get('/admin/stats', auth, authorize('ADMIN'), getContactStats);
router.get('/admin/:contactId', auth, authorize('ADMIN'), getContactById);
router.patch('/admin/:contactId/status', auth, authorize('ADMIN'), updateContactStatus);
router.put('/admin/:contactId', auth, authorize('ADMIN'), updateContact);
router.delete('/admin/:contactId', auth, authorize('ADMIN'), deleteContact);
router.patch('/admin/bulk/status', auth, authorize('ADMIN'), bulkUpdateContactStatus);

export default router;