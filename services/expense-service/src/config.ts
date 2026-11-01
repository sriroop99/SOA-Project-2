import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.EXPENSE_SERVICE_PORT || process.env.PORT || '5002', 10),
  instanceId: process.env.INSTANCE_ID || 'expense-service-1',
  jwtSecret: process.env.JWT_SECRET || 'spendwise_super_secret_jwt_key_2026_review2_cluster1',
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
};
