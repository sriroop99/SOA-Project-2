import {
  comparePassword,
  hashPassword,
  makeErrorResponse,
  makeSuccessResponse,
  signAccessToken,
  signRefreshToken,
  toSafeUser,
  verifyRefreshToken,
  UserRole,
} from '@spendwise/shared';
import { authRepo } from '../db/auth-db.js';

export class AuthService {
  public async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    departmentId?: string;
    departmentName?: string;
  }) {
    const existing = await authRepo.findUserByEmail(data.email);
    if (existing) {
      throw { status: 409, code: 'USER_EXISTS', message: 'An account with this email already exists' };
    }

    const passwordHash = await hashPassword(data.password);
    const user = await authRepo.createUser({
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      departmentId: data.departmentId,
      departmentName: data.departmentName,
    });

    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      departmentName: user.departmentName,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    const refreshToken = signRefreshToken(user.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await authRepo.saveRefreshToken(user.id, refreshToken, expiresAt);

    return {
      user: toSafeUser(user),
      accessToken,
      refreshToken,
    };
  }

  public async login(data: { email: string; password: string }) {
    const user = await authRepo.findUserByEmail(data.email);
    if (!user) {
      // Intentionally generic error message to prevent enumeration
      throw { status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };
    }

    if (!user.isActive) {
      throw { status: 403, code: 'ACCOUNT_DEACTIVATED', message: 'This account has been deactivated' };
    }

    const isValid = await comparePassword(data.password, user.passwordHash);
    if (!isValid) {
      throw { status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };
    }

    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      departmentName: user.departmentName,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    const refreshToken = signRefreshToken(user.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await authRepo.saveRefreshToken(user.id, refreshToken, expiresAt);

    return {
      user: toSafeUser(user),
      accessToken,
      refreshToken,
    };
  }

  public async refreshToken(token: string) {
    let decoded: { userId: string };
    try {
      decoded = verifyRefreshToken(token);
    } catch (err: any) {
      throw { status: 401, code: 'INVALID_TOKEN', message: 'Invalid or expired refresh token' };
    }

    const record = await authRepo.findRefreshToken(token);
    if (!record || record.revoked) {
      // Possible token reuse attack - revoke all user tokens for security
      await authRepo.revokeAllUserTokens(decoded.userId);
      throw { status: 401, code: 'TOKEN_REVOKED', message: 'Refresh token has been revoked or reused' };
    }

    const user = await authRepo.findUserById(decoded.userId);
    if (!user || !user.isActive) {
      throw { status: 403, code: 'USER_INACTIVE', message: 'User account is no longer active' };
    }

    // Refresh token rotation: revoke used token, issue new pair
    await authRepo.revokeRefreshToken(token);

    const newAccessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      departmentName: user.departmentName,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    const newRefreshToken = signRefreshToken(user.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await authRepo.saveRefreshToken(user.id, newRefreshToken, expiresAt);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: toSafeUser(user),
    };
  }

  public async logout(token: string) {
    if (!token) return true;
    return authRepo.revokeRefreshToken(token);
  }

  public async getMe(userId: string) {
    const user = await authRepo.findUserById(userId);
    if (!user) {
      throw { status: 404, code: 'USER_NOT_FOUND', message: 'User not found' };
    }
    return toSafeUser(user);
  }

  public async listUsers() {
    const users = await authRepo.listUsers();
    return users.map(toSafeUser);
  }
}

export const authService = new AuthService();
