import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { JWTPayload, SafeUser, User } from './types.js';

export const JWT_ACCESS_EXPIRY = '15m'; // 15 minutes
export const JWT_REFRESH_EXPIRY = '7d'; // 7 days
export const DEFAULT_ISSUER = 'spendwise-auth-service';
export const DEFAULT_AUDIENCE = 'spendwise-app';

export const getJwtSecret = (): string => {
  return process.env.JWT_SECRET || 'spendwise_super_secret_jwt_key_2026_review2_cluster1';
};

export const getJwtRefreshSecret = (): string => {
  return process.env.JWT_REFRESH_SECRET || 'spendwise_super_secret_refresh_key_2026_review2';
};

/**
 * Hash password securely with bcrypt salt rounds
 */
export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

/**
 * Compare plain text password against hash
 */
export async function comparePassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

/**
 * Sign a short-lived JWT access token
 */
export function signAccessToken(
  payload: Omit<JWTPayload, 'iss' | 'aud' | 'exp' | 'iat'>,
  secret: string = getJwtSecret()
): string {
  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn: JWT_ACCESS_EXPIRY,
    issuer: DEFAULT_ISSUER,
    audience: DEFAULT_AUDIENCE,
  });
}

/**
 * Sign a long-lived JWT refresh token
 */
export function signRefreshToken(
  userId: string,
  secret: string = getJwtRefreshSecret()
): string {
  return jwt.sign({ userId, type: 'refresh', jti: uuidv4() }, secret, {
    algorithm: 'HS256',
    expiresIn: JWT_REFRESH_EXPIRY,
    issuer: DEFAULT_ISSUER,
    audience: DEFAULT_AUDIENCE,
  });
}

/**
 * Verify JWT access token with issuer and audience checks
 */
export function verifyAccessToken(
  token: string,
  secret: string = getJwtSecret()
): JWTPayload {
  const decoded = jwt.verify(token, secret, {
    algorithms: ['HS256'],
    issuer: DEFAULT_ISSUER,
    audience: DEFAULT_AUDIENCE,
  });
  return decoded as JWTPayload;
}

/**
 * Verify JWT refresh token
 */
export function verifyRefreshToken(
  token: string,
  secret: string = getJwtRefreshSecret()
): { userId: string } {
  const decoded = jwt.verify(token, secret, {
    algorithms: ['HS256'],
    issuer: DEFAULT_ISSUER,
    audience: DEFAULT_AUDIENCE,
  });
  return decoded as { userId: string };
}

/**
 * Strip sensitive credentials from User object
 */
export function toSafeUser(user: User): SafeUser {
  const { passwordHash, ...safe } = user;
  return safe;
}
