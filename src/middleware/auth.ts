import dotenv from "dotenv";
import type { NextFunction, Request, Response } from "express";

dotenv.config();

export interface RequestWithUser extends Request {
  user?: {
    _id: string;
    username: string;
  };
}

type SessionData = {
  user: {
    _id: string;
    username: string;
  };
};

const userServiceUrl = process.env.USER_SERVICE_URL ?? "http://localhost:8583";

/**
 * Middleware to find user from session by calling user service
 * Adds user to req.user if session is valid
 */
export const findUserFromSession = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  const sessionCookie = req.headers.cookie;

  if (!sessionCookie) {
    return next();
  }

  try {
    const response = await fetch(`${userServiceUrl}/api/v1/session`, {
      method: "GET",
      headers: {
        Cookie: sessionCookie,
      },
      signal: AbortSignal.timeout(5000), // 5-second timeout
    });

    if (response.ok) {
      const data = (await response.json()) as SessionData;
      req.user = data.user;
    } else {
      console.log(`Session validation failed: ${response.status}`);
    }
    return next();
  } catch (error) {
    console.error("Session validation error:", error instanceof Error ? error.message : "Unknown error");
    return next();
  }
};

/**
 * Middleware to ensure user is authenticated
 * Returns 401 if no valid user session
 */
export const requireAuth = (req: RequestWithUser, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication required. Please log in.",
      },
    });
    return;
  }
  next();
};

/**
 * Middleware to optionally authenticate user
 * Continues regardless of authentication status
 */
export const optionalAuth = findUserFromSession;
