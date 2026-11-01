import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../services/auth-service/src/server.js';
import { runAllSeeds } from '../scripts/seed-all.js';
import { DEFAULT_AUDIENCE, DEFAULT_ISSUER } from '../services/shared/src/auth-utils.js';

describe('Auth Service & JWT Authentication Tests', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await runAllSeeds();
  });

  it('1. should successfully login with valid credentials (admin)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@spendwise.corp', password: 'Admin@12345' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.email).toBe('admin@spendwise.corp');
    expect(res.body.data.user.role).toBe('ADMIN');
    expect(res.body.data.user.passwordHash).toBeUndefined(); // never expose passwordHash
  });

  it('2. should reject login with invalid credentials (401)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@spendwise.corp', password: 'WrongPassword!123' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('3. should reject protected request when bearer token is missing (401)', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('4. should reject protected request with tampered/invalid signature (401)', async () => {
    // Sign token with a rogue secret
    const rogueToken = jwt.sign(
      { userId: 'fake-id', role: 'ADMIN', email: 'rogue@fake.com' },
      'wrong_untrusted_secret_key_123',
      { issuer: DEFAULT_ISSUER, audience: DEFAULT_AUDIENCE }
    );

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${rogueToken}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('5. should reject protected request with an expired token (401)', async () => {
    const secret = process.env.JWT_SECRET || 'spendwise_super_secret_jwt_key_2026_review2_cluster1';
    const expiredToken = jwt.sign(
      { userId: 'seed-admin', role: 'ADMIN', email: 'admin@spendwise.corp' },
      secret,
      { expiresIn: '-1s', issuer: DEFAULT_ISSUER, audience: DEFAULT_AUDIENCE }
    );

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('6. should reject unauthorized access for insufficient permissions (403)', async () => {
    // Login as employee
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'employee@spendwise.corp', password: 'Employee@12345' });

    const employeeToken = loginRes.body.data.accessToken;

    // Attempt to access user management endpoint which requires ADMIN or FINANCE_MANAGER
    const res = await request(app)
      .get('/api/auth/users')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('7. should allow ADMIN to access user management list', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@spendwise.corp', password: 'Admin@12345' });

    const adminToken = loginRes.body.data.accessToken;

    const res = await request(app)
      .get('/api/auth/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
  });

  it('8. should support refresh token rotation', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'finance@spendwise.corp', password: 'Finance@12345' });

    const originalRefresh = loginRes.body.data.refreshToken;

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: originalRefresh });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.success).toBe(true);
    expect(refreshRes.body.data.accessToken).toBeDefined();
    expect(refreshRes.body.data.refreshToken).toBeDefined();
    expect(refreshRes.body.data.refreshToken).not.toBe(originalRefresh); // rotated!

    // Using the old refresh token again should be rejected (revoked)
    const reuseRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: originalRefresh });

    expect(reuseRes.status).toBe(401);
    expect(reuseRes.body.error.code).toBe('TOKEN_REVOKED');
  });
});
