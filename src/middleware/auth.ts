import dotenv from "dotenv";
import type { NextFunction, Request, Response } from "express";

dotenv.config();

export interface RequestWithUser extends Request {
  user?: {
    _id: string;
    username: string;
  };
}

type JWTUserData = {
  success: boolean;
  data: {
    user: {
      _id: string;
      username: string;
    };
  };
};

const userServiceUrl = process.env.USER_SERVICE_URL ?? "http://localhost:8583";

/**
 * Middleware to authenticate user via JWT token by calling user service
 * Adds user to req.user if JWT token is valid
 */
export const authenticateJWT = async (req: RequestWithUser, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

  if (!token) {
    return next();
  }

  try {
    const response = await fetch(`${userServiceUrl}/api/v1/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(5000), // 5-second timeout
    });

    if (response.ok) {
      const data = (await response.json()) as JWTUserData;
      if (data.success && data.data?.user) {
        req.user = data.data.user;
      }
    } else {
      console.log(`JWT validation failed: ${response.status}`);
    }
    return next();
  } catch (error) {
    console.error("JWT validation error:", error instanceof Error ? error.message : "Unknown error");
    return next();
  }
};

/**
 * Middleware to require JWT authentication
 * Returns 401 if no valid JWT token is provided
 */
export const requireAuth = (req: RequestWithUser, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: "AUTHENTICATION_REQUIRED",
        message: "Valid JWT token required. Please provide a valid token in the Authorization header.",
      },
    });
    return;
  }
  next();
};

/**
 * Middleware to optionally authenticate user with JWT
 * Continues regardless of authentication status
 */
export const optionalAuth = authenticateJWT;
