import type { NextFunction, Response } from "express";
import type { RequestWithUser } from "../../src/middleware/auth.js";

/**
 * Mock authentication middleware for testing
 * Simulates an authenticated user
 */
export const mockAuth = (userId: string, username = "testuser") => {
  return (req: RequestWithUser, _res: Response, next: NextFunction): void => {
    req.user = {
      _id: userId,
      username,
    };
    next();
  };
};

/**
 * Mock unauthenticated middleware for testing
 * Simulates no authenticated user
 */
export const mockNoAuth = (req: RequestWithUser, _res: Response, next: NextFunction): void => {
  req.user = undefined;
  next();
};
