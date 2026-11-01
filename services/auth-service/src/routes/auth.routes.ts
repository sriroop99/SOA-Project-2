import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/auth.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';

export const authRouter = Router();

// Rate limiter for login endpoint to prevent brute-force credential stuffing
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many login attempts. Please try again after 5 minutes.',
    },
    timestamp: new Date().toISOString(),
  },
});

authRouter.post('/register', authController.register);
authRouter.post('/login', loginLimiter, authController.login);
authRouter.post('/refresh', authController.refreshToken);
authRouter.post('/logout', authController.logout);

// Protected routes
authRouter.get('/me', authenticateToken, authController.getMe);
authRouter.get('/users', authenticateToken, requireRole('ADMIN', 'FINANCE_MANAGER'), authController.listUsers);
