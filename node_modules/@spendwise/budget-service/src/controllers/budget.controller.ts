import { Response } from 'express';
import {
  AuthenticatedRequest,
  CreateBudgetSchema,
  CreateDepartmentSchema,
  makeErrorResponse,
  makeSuccessResponse,
  ReconcileRequestSchema,
  UpdateBudgetSchema,
} from '@spendwise/shared';
import { budgetService } from '../services/budget.service.js';

export class BudgetController {
  // Departments
  public async listDepartments(req: AuthenticatedRequest, res: Response) {
    try {
      const depts = await budgetService.listDepartments();
      res.status(200).json(makeSuccessResponse(depts));
    } catch (err: any) {
      res.status(500).json(makeErrorResponse('DEPARTMENTS_FAILED', 'Failed to fetch departments'));
    }
  }

  public async createDepartment(req: AuthenticatedRequest, res: Response) {
    try {
      const parsed = CreateDepartmentSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(makeErrorResponse('VALIDATION_ERROR', 'Invalid department data', parsed.error.format()));
        return;
      }
      const created = await budgetService.createDepartment(parsed.data);
      res.status(201).json(makeSuccessResponse(created, undefined, 'Department created successfully'));
    } catch (err: any) {
      res.status(500).json(makeErrorResponse('CREATE_DEPARTMENT_FAILED', 'Failed to create department'));
    }
  }

  // Budgets
  public async listBudgets(req: AuthenticatedRequest, res: Response) {
    try {
      const { departmentId, fiscalYear, period } = req.query as any;
      const budgets = await budgetService.listBudgets({
        departmentId,
        fiscalYear: fiscalYear ? parseInt(fiscalYear, 10) : undefined,
        period,
      });
      res.status(200).json(makeSuccessResponse(budgets));
    } catch (err: any) {
      res.status(500).json(makeErrorResponse('BUDGETS_FAILED', 'Failed to fetch budgets'));
    }
  }

  public async getBudgetById(req: AuthenticatedRequest, res: Response) {
    try {
      const budget = await budgetService.getBudgetById(req.params.id);
      if (!budget) {
        res.status(404).json(makeErrorResponse('BUDGET_NOT_FOUND', 'Budget not found'));
        return;
      }
      res.status(200).json(makeSuccessResponse(budget));
    } catch (err: any) {
      res.status(500).json(makeErrorResponse('FETCH_BUDGET_FAILED', 'Failed to fetch budget'));
    }
  }

  public async createBudget(req: AuthenticatedRequest, res: Response) {
    try {
      const parsed = CreateBudgetSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(makeErrorResponse('VALIDATION_ERROR', 'Invalid budget data', parsed.error.format()));
        return;
      }

      const created = await budgetService.createBudget(parsed.data as any);
      res.status(201).json(makeSuccessResponse(created, undefined, 'Budget allocated successfully'));
    } catch (err: any) {
      res.status(500).json(makeErrorResponse('CREATE_BUDGET_FAILED', err.message || 'Failed to allocate budget'));
    }
  }

  public async updateBudget(req: AuthenticatedRequest, res: Response) {
    try {
      const parsed = UpdateBudgetSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(makeErrorResponse('VALIDATION_ERROR', 'Invalid update parameters', parsed.error.format()));
        return;
      }

      const updated = await budgetService.updateBudget(req.params.id, parsed.data);
      res.status(200).json(makeSuccessResponse(updated, undefined, 'Budget updated successfully'));
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json(makeErrorResponse(err.code || 'ERROR', err.message || 'Failed to update budget'));
    }
  }

  public async deleteBudget(req: AuthenticatedRequest, res: Response) {
    try {
      await budgetService.deleteBudget(req.params.id);
      res.status(200).json(makeSuccessResponse({ deleted: true, id: req.params.id }, undefined, 'Budget deleted'));
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json(makeErrorResponse(err.code || 'ERROR', err.message || 'Failed to delete budget'));
    }
  }

  // Reconciliation
  public async reconcile(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        res.status(401).json(makeErrorResponse('UNAUTHORIZED', 'Authentication required'));
        return;
      }

      const parsed = ReconcileRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(makeErrorResponse('VALIDATION_ERROR', 'Invalid reconciliation request', parsed.error.format()));
        return;
      }

      const result = await budgetService.runReconciliation(req.user, parsed.data as any);
      res.status(200).json(makeSuccessResponse(result, undefined, 'Reconciliation completed successfully'));
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json(makeErrorResponse(err.code || 'ERROR', err.message || 'Reconciliation failed'));
    }
  }

  public async listReconciliations(req: AuthenticatedRequest, res: Response) {
    try {
      const { departmentId, fiscalYear } = req.query as any;
      const history = await budgetService.listReconciliations({
        departmentId,
        fiscalYear: fiscalYear ? parseInt(fiscalYear, 10) : undefined,
      });
      res.status(200).json(makeSuccessResponse(history));
    } catch (err: any) {
      res.status(500).json(makeErrorResponse('RECONCILIATION_HISTORY_FAILED', 'Failed to fetch reconciliation history'));
    }
  }
}

export const budgetController = new BudgetController();
