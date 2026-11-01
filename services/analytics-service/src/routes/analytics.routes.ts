import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller.js';
import { authenticateToken } from '@spendwise/shared';

export const analyticsRouter = Router();

analyticsRouter.get('/dashboard', authenticateToken, (req, res) => analyticsController.getDashboard(req as any, res));
analyticsRouter.get('/export/csv', authenticateToken, (req, res) => analyticsController.exportCSV(req as any, res));
