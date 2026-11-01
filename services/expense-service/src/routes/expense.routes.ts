import { Router } from 'express';
import { expenseController } from '../controllers/expense.controller.js';
import { authenticateToken, requireRole } from '@spendwise/shared';

export const expenseRouter = Router();

// Diagnostic endpoint demonstrating which instance handled the request
expenseRouter.get('/diagnostic', (req, res) => expenseController.getDiagnostic(req as any, res));

// Categories
expenseRouter.get('/categories', authenticateToken, (req, res) => expenseController.getCategories(req as any, res));

// Internal endpoint for inter-service communication
expenseRouter.get('/internal/all', (req, res) => expenseController.getRawExpensesInternal(req as any, res));

// Core CRUD operations
expenseRouter.post('/', authenticateToken, (req, res) => expenseController.createExpense(req as any, res));
expenseRouter.get('/', authenticateToken, (req, res) => expenseController.listExpenses(req as any, res));
expenseRouter.get('/:id', authenticateToken, (req, res) => expenseController.getExpenseById(req as any, res));
expenseRouter.patch('/:id', authenticateToken, (req, res) => expenseController.updateExpense(req as any, res));
expenseRouter.delete('/:id', authenticateToken, (req, res) => expenseController.deleteExpense(req as any, res));

// Approval workflow routes
expenseRouter.post(
  '/:id/review',
  authenticateToken,
  requireRole('ADMIN', 'FINANCE_MANAGER'),
  (req, res) => expenseController.reviewExpense(req as any, res)
);

// Status history
expenseRouter.get('/:id/history', authenticateToken, (req, res) => expenseController.getExpenseHistory(req as any, res));
