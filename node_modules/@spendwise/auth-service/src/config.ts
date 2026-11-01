import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.AUTH_SERVICE_PORT || '5001', 10),
  jwtSecret: process.env.JWT_SECRET || 'spendwise_super_secret_jwt_key_2026_review2_cluster1',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'spendwise_super_secret_refresh_key_2026_review2',
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
};
