import { Response } from 'express';
import { AuthenticatedRequest, makeErrorResponse, makeSuccessResponse } from '@spendwise/shared';
import { analyticsService } from '../services/analytics.service.js';

export class AnalyticsController {
  public async getDashboard(req: AuthenticatedRequest, res: Response) {
    try {
      const year = req.query.year ? parseInt(req.query.year as string, 10) : 2026;
      const data = await analyticsService.getDashboardSummary(year);
      res.status(200).json(makeSuccessResponse(data));
    } catch (err: any) {
      res.status(500).json(makeErrorResponse('DASHBOARD_ERROR', err.message || 'Failed to generate dashboard summary'));
    }
  }

  public async exportCSV(req: AuthenticatedRequest, res: Response) {
    try {
      const csv = await analyticsService.exportExpensesToCSV(req.query as any);
      const filename = `spendwise_report_${new Date().toISOString().slice(0, 10)}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    } catch (err: any) {
      res.status(500).json(makeErrorResponse('CSV_EXPORT_ERROR', 'Failed to export CSV report'));
    }
  }
}

export const analyticsController = new AnalyticsController();
