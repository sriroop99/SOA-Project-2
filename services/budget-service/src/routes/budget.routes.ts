import { Router } from 'express';
import { budgetController } from '../controllers/budget.controller.js';
import { authenticateToken, requireRole } from '@spendwise/shared';

export const budgetRouter = Router();

// Departments
budgetRouter.get('/departments', authenticateToken, (req, res) => budgetController.listDepartments(req as any, res));
budgetRouter.post(
  '/departments',
  authenticateToken,
  requireRole('ADMIN'),
  (req, res) => budgetController.createDepartment(req as any, res)
);

// Budgets
budgetRouter.get('/', authenticateToken, (req, res) => budgetController.listBudgets(req as any, res));
budgetRouter.get('/:id', authenticateToken, (req, res) => budgetController.getBudgetById(req as any, res));
budgetRouter.post(
  '/',
  authenticateToken,
  requireRole('ADMIN', 'FINANCE_MANAGER'),
  (req, res) => budgetController.createBudget(req as any, res)
);
budgetRouter.patch(
  '/:id',
  authenticateToken,
  requireRole('ADMIN', 'FINANCE_MANAGER'),
  (req, res) => budgetController.updateBudget(req as any, res)
);
budgetRouter.delete(
  '/:id',
  authenticateToken,
  requireRole('ADMIN'),
  (req, res) => budgetController.deleteBudget(req as any, res)
);

// Reconciliation
budgetRouter.post(
  '/reconcile',
  authenticateToken,
  requireRole('ADMIN', 'FINANCE_MANAGER'),
  (req, res) => budgetController.reconcile(req as any, res)
);
budgetRouter.get(
  '/reconciliations',
  authenticateToken,
  (req, res) => budgetController.listReconciliations(req as any, res)
);
