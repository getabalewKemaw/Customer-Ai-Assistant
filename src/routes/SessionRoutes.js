// src/routes/authRoutes.js (Example - add to your Express app setup, e.g., in index.js)
import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { refresh, revokeSession } from '../controllers/tokenControllers.js';
const router = express.Router();
router.post('/refresh', refresh);
router.post('/revoke', requireAuth, revokeSession); // Protected, e.g., for user to revoke devices
export default router;