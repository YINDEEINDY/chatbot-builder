import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './errorHandler.js';

export interface AuthRequest extends Request {
  userId?: string;
}

interface JwtPayload {
  userId: string;
}

export const auth = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Unauthorized - No token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    req.userId = decoded.userId;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Unauthorized - Invalid token', 401));
    }
    next(error);
  }
};
