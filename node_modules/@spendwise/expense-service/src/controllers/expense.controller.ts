import { Response } from 'express';
import {
  AuthenticatedRequest,
  CreateExpenseSchema,
  ExpenseQuerySchema,
  makeErrorResponse,
  makeSuccessResponse,
  ReviewExpenseSchema,
  UpdateExpenseSchema,
} from '@spendwise/shared';
import { expenseService } from '../services/expense.service.js';
import { config } from '../config.js';

export class ExpenseController {
  public async getCategories(req: AuthenticatedRequest, res: Response) {
    try {
      const categories = await expenseService.getCategories();
      res.status(200).json(makeSuccessResponse(categories));
    } catch (err: any) {
      res.status(500).json(makeErrorResponse('CATEGORIES_FAILED', 'Failed to retrieve categories'));
    }
  }

  public async createExpense(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        res.status(401).json(makeErrorResponse('UNAUTHORIZED', 'Authentication required'));
        return;
      }

      const parsed = CreateExpenseSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(makeErrorResponse('VALIDATION_ERROR', 'Invalid expense data', parsed.error.format()));
        return;
      }

      const result = await expenseService.createExpense(req.user, parsed.data);
      res.status(201).json(makeSuccessResponse(result, { instanceId: config.instanceId }, 'Expense created successfully'));
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json(makeErrorResponse(err.code || 'ERROR', err.message || 'Failed to create expense'));
    }
  }

  public async listExpenses(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        res.status(401).json(makeErrorResponse('UNAUTHORIZED', 'Authentication required'));
        return;
      }

      const parsed = ExpenseQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json(makeErrorResponse('VALIDATION_ERROR', 'Invalid query parameters', parsed.error.format()));
        return;
      }

      const result = await expenseService.listExpenses(req.user, parsed.data);
      res.status(200).json(
        makeSuccessResponse(result.items, {
          instanceId: config.instanceId,
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        })
      );
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json(makeErrorResponse(err.code || 'ERROR', err.message || 'Failed to list expenses'));
    }
  }

  public async getExpenseById(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        res.status(401).json(makeErrorResponse('UNAUTHORIZED', 'Authentication required'));
        return;
      }

      const id = req.params.id;
      const expense = await expenseService.getExpenseById(req.user, id);
      res.status(200).json(makeSuccessResponse(expense, { instanceId: config.instanceId }));
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json(makeErrorResponse(err.code || 'ERROR', err.message || 'Failed to fetch expense'));
    }
  }

  public async updateExpense(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        res.status(401).json(makeErrorResponse('UNAUTHORIZED', 'Authentication required'));
        return;
      }

      const id = req.params.id;
      const parsed = UpdateExpenseSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(makeErrorResponse('VALIDATION_ERROR', 'Invalid update parameters', parsed.error.format()));
        return;
      }

      const updated = await expenseService.updateExpense(req.user, id, parsed.data);
      res.status(200).json(makeSuccessResponse(updated, { instanceId: config.instanceId }, 'Expense updated successfully'));
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json(makeErrorResponse(err.code || 'ERROR', err.message || 'Failed to update expense'));
    }
  }

  public async deleteExpense(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        res.status(401).json(makeErrorResponse('UNAUTHORIZED', 'Authentication required'));
        return;
      }

      const id = req.params.id;
      await expenseService.deleteExpense(req.user, id);
      res.status(200).json(makeSuccessResponse({ deleted: true, id }, { instanceId: config.instanceId }, 'Expense deleted successfully'));
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json(makeErrorResponse(err.code || 'ERROR', err.message || 'Failed to delete expense'));
    }
  }

  public async reviewExpense(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        res.status(401).json(makeErrorResponse('UNAUTHORIZED', 'Authentication required'));
        return;
      }

      const id = req.params.id;
      const parsed = ReviewExpenseSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(makeErrorResponse('VALIDATION_ERROR', 'Invalid review payload', parsed.error.format()));
        return;
      }

      const reviewed = await expenseService.reviewExpense(req.user, id, parsed.data);
      res.status(200).json(makeSuccessResponse(reviewed, { instanceId: config.instanceId }, `Expense ${parsed.data.status.toLowerCase()} successfully`));
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json(makeErrorResponse(err.code || 'ERROR', err.message || 'Failed to process review'));
    }
  }

  public async getExpenseHistory(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        res.status(401).json(makeErrorResponse('UNAUTHORIZED', 'Authentication required'));
        return;
      }

      const id = req.params.id;
      const history = await expenseService.getExpenseHistory(req.user, id);
      res.status(200).json(makeSuccessResponse(history, { instanceId: config.instanceId }));
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json(makeErrorResponse(err.code || 'ERROR', err.message || 'Failed to fetch history'));
    }
  }

  public async getDiagnostic(req: AuthenticatedRequest, res: Response) {
    const raw = await expenseService.getAllExpensesRaw();
    const currentInstanceId = (res.getHeader('X-Service-Instance') as string) || config.instanceId;
    res.status(200).json(
      makeSuccessResponse({
        instanceId: currentInstanceId,
        port: config.port,
        uptime: process.uptime(),
        databaseStatus: 'CONNECTED',
        totalExpensesCount: raw.length,
        timestamp: new Date().toISOString(),
      })
    );
  }

  public async getRawExpensesInternal(req: AuthenticatedRequest, res: Response) {
    // Internal endpoint used by Analytics & Budget reconciliation services
    const raw = await expenseService.getAllExpensesRaw();
    res.status(200).json(makeSuccessResponse(raw, { instanceId: config.instanceId }));
  }
}

export const expenseController = new ExpenseController();
