import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.BUDGET_SERVICE_PORT || '5004', 10),
  expenseServiceUrl: process.env.EXPENSE_SERVICE_URL || 'http://127.0.0.1:8080',
  jwtSecret: process.env.JWT_SECRET || 'spendwise_super_secret_jwt_key_2026_review2_cluster1',
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
};
