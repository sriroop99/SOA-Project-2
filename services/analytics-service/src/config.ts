import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.ANALYTICS_SERVICE_PORT || '5005', 10),
  jwtSecret: process.env.JWT_SECRET || 'spendwise_super_secret_jwt_key_2026_review2_cluster1',
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
};
