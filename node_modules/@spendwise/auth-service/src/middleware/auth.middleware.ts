import { Request, Response, NextFunction } from 'express';
import { JWTPayload, makeErrorResponse, UserRole, verifyAccessToken } from '@spendwise/shared';

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json(makeErrorResponse('UNAUTHORIZED', 'Access token is missing or malformed'));
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json(makeErrorResponse('TOKEN_EXPIRED', 'Access token has expired'));
      return;
    }
    if (err.name === 'JsonWebTokenError') {
      res.status(401).json(makeErrorResponse('INVALID_TOKEN', 'Access token signature or format is invalid'));
      return;
    }
    res.status(401).json(makeErrorResponse('UNAUTHORIZED', 'Authentication failed'));
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(makeErrorResponse('UNAUTHORIZED', 'Authentication required'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json(
        makeErrorResponse(
          'FORBIDDEN',
          `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`
        )
      );
      return;
    }

    next();
  };
}
