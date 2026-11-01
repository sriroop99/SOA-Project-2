import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.GATEWAY_PORT || '5000', 10),
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://127.0.0.1:5001',
  expenseServiceUrl: process.env.EXPENSE_SERVICE_URL || 'http://127.0.0.1:8080', // Nginx or LB
  budgetServiceUrl: process.env.BUDGET_SERVICE_URL || 'http://127.0.0.1:5004',
  analyticsServiceUrl: process.env.ANALYTICS_SERVICE_URL || 'http://127.0.0.1:5005',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  jwtSecret: process.env.JWT_SECRET || 'spendwise_super_secret_jwt_key_2026_review2_cluster1',
};
