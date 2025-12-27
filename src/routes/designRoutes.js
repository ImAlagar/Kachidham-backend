// routes/designRoutes.js
import express from 'express';
import {
  createDesign,
  getDesignById,
  getUserDesigns,
  updateDesign,
  deleteDesign,
  generateDesignPreview
} from '../controllers/designController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication or session
router.post('/', createDesign);
router.get('/user', auth, getUserDesigns);
router.get('/:designId', getDesignById);
router.put('/:designId', updateDesign);
router.delete('/:designId', deleteDesign);
router.get('/:designId/preview', generateDesignPreview);

export default router;