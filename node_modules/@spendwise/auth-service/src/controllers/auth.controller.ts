import { Request, Response } from 'express';
import {
  LoginSchema,
  makeErrorResponse,
  makeSuccessResponse,
  RefreshTokenSchema,
  RegisterSchema,
} from '@spendwise/shared';
import { authService } from '../services/auth.service.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export class AuthController {
  public async register(req: Request, res: Response) {
    try {
      const parsed = RegisterSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(makeErrorResponse('VALIDATION_ERROR', 'Invalid registration data', parsed.error.format()));
        return;
      }

      const result = await authService.register(parsed.data);
      res.status(201).json(makeSuccessResponse(result, undefined, 'User registered successfully'));
    } catch (err: any) {
      const status = err.status || 500;
      const code = err.code || 'INTERNAL_ERROR';
      const message = err.message || 'Registration failed';
      res.status(status).json(makeErrorResponse(code, message));
    }
  }

  public async login(req: Request, res: Response) {
    try {
      const parsed = LoginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(makeErrorResponse('VALIDATION_ERROR', 'Invalid login credentials format', parsed.error.format()));
        return;
      }

      const result = await authService.login(parsed.data);
      res.status(200).json(makeSuccessResponse(result, undefined, 'Login successful'));
    } catch (err: any) {
      const status = err.status || 500;
      const code = err.code || 'INTERNAL_ERROR';
      const message = err.message || 'Login failed';
      res.status(status).json(makeErrorResponse(code, message));
    }
  }

  public async refreshToken(req: Request, res: Response) {
    try {
      const parsed = RefreshTokenSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(makeErrorResponse('VALIDATION_ERROR', 'Refresh token is required'));
        return;
      }

      const result = await authService.refreshToken(parsed.data.refreshToken);
      res.status(200).json(makeSuccessResponse(result, undefined, 'Token refreshed successfully'));
    } catch (err: any) {
      const status = err.status || 401;
      const code = err.code || 'REFRESH_FAILED';
      const message = err.message || 'Failed to refresh token';
      res.status(status).json(makeErrorResponse(code, message));
    }
  }

  public async logout(req: Request, res: Response) {
    try {
      const token = req.body?.refreshToken;
      await authService.logout(token);
      res.status(200).json(makeSuccessResponse({ loggedOut: true }, undefined, 'Logged out successfully'));
    } catch (err: any) {
      res.status(500).json(makeErrorResponse('LOGOUT_FAILED', 'Failed to log out cleanly'));
    }
  }

  public async getMe(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        res.status(401).json(makeErrorResponse('UNAUTHORIZED', 'Not authenticated'));
        return;
      }
      const user = await authService.getMe(req.user.userId);
      res.status(200).json(makeSuccessResponse(user));
    } catch (err: any) {
      const status = err.status || 500;
      res.status(status).json(makeErrorResponse(err.code || 'ERROR', err.message || 'Failed to fetch user'));
    }
  }

  public async listUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const users = await authService.listUsers();
      res.status(200).json(makeSuccessResponse(users));
    } catch (err: any) {
      res.status(500).json(makeErrorResponse('LIST_USERS_FAILED', 'Failed to fetch user list'));
    }
  }
}

export const authController = new AuthController();
