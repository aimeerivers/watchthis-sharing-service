import type { Express, Response } from "express";

import { prisma } from "./app.js";
import { type RequestWithUser, requireAuth } from "./middleware/auth.js";
import { Share } from "./models/share.js";
import { asyncHandler } from "./utils/asyncHandler.js";
import { isValidUUID } from "./utils/uuid.js";

/**
 * Mount API routes on the Express app
 */
export function mountApi(mountRoute: string, app: Express): void {
  // Basic status endpoint
  app.get(mountRoute + "/status", (_req, res) => {
    res.json({ status: "OK", message: "Sharing API is running" });
  });

  // Create new share
  app.post(
    mountRoute + "/shares",
    requireAuth,
    asyncHandler(async (req: RequestWithUser, res: Response) => {
      const { mediaId, toUserId, message } = req.body;

      // Get fromUserId from authenticated session
      const fromUserId = req.user!.id;

      // Basic validation
      if (!mediaId || !toUserId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_FIELDS",
            message: "mediaId and toUserId are required",
          },
        });
      }

      // TODO: Validate user IDs exist via user service
      // TODO: Validate media ID exists via media service
      // TODO: Check if users are friends/allowed to share (not needed for self-shares)

      const share = await Share.create({
        mediaId,
        fromUserId,
        toUserId,
        message: message?.trim(),
      });

      res.status(201).json({
        success: true,
        data: share,
      });
    })
  );

  // Get shares sent by user - MUST be before /:id route
  app.get(
    mountRoute + "/shares/sent",
    requireAuth,
    asyncHandler(async (req: RequestWithUser, res: Response) => {
      // Get userId from authenticated session
      const userId = req.user!.id;

      const { status, page = 1, limit = 20 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = { fromUserId: userId };
      if (status && status !== "all") {
        where.status = status;
      }

      const [shares, total] = await Promise.all([
        prisma.share.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: Number(limit),
        }),
        prisma.share.count({ where }),
      ]);

      res.json({
        success: true,
        data: shares,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          hasNext: skip + shares.length < total,
        },
      });
    })
  );

  // Get shares received by user - MUST be before /:id route
  app.get(
    mountRoute + "/shares/received",
    requireAuth,
    asyncHandler(async (req: RequestWithUser, res: Response) => {
      // Get userId from authenticated session
      const userId = req.user!.id;

      const { status, page = 1, limit = 20 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = { toUserId: userId };
      if (status && status !== "all") {
        where.status = status;
      }

      const [shares, total] = await Promise.all([
        prisma.share.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: Number(limit),
        }),
        prisma.share.count({ where }),
      ]);

      res.json({
        success: true,
        data: shares,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          hasNext: skip + shares.length < total,
        },
      });
    })
  );

  // Get sharing statistics for user - MUST be before /:id route
  app.get(
    mountRoute + "/shares/stats",
    requireAuth,
    asyncHandler(async (req: RequestWithUser, res: Response) => {
      // Get userId from authenticated session
      const userId = req.user!.id;

      const [sentStats, receivedStats] = await Promise.all([
        prisma.share.groupBy({
          by: ["status"],
          where: { fromUserId: userId as string },
          _count: { status: true },
        }),
        prisma.share.groupBy({
          by: ["status"],
          where: { toUserId: userId as string },
          _count: { status: true },
        }),
      ]);

      const formatStats = (stats: any[]) => {
        const result = { pending: 0, watched: 0, archived: 0, total: 0 };
        stats.forEach((stat) => {
          result[stat.status as keyof typeof result] = stat._count.status;
          result.total += stat._count.status;
        });
        return result;
      };

      res.json({
        success: true,
        data: {
          sent: formatStats(sentStats),
          received: formatStats(receivedStats),
        },
      });
    })
  );

  // Get share by ID
  app.get(
    mountRoute + "/shares/:id",
    requireAuth,
    asyncHandler(async (req: RequestWithUser, res: Response) => {
      const { id } = req.params;
      const userId = req.user!.id;

      if (!isValidUUID(id)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_ID",
            message: "Invalid share ID format",
          },
        });
      }

      const share = await Share.findById(id);

      if (!share) {
        return res.status(404).json({
          success: false,
          error: {
            code: "SHARE_NOT_FOUND",
            message: "Share not found",
          },
        });
      }

      // Check user permissions (only sender/receiver can view)
      if (share.fromUserId.toString() !== userId && share.toUserId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You don't have permission to view this share",
          },
        });
      }

      res.json({
        success: true,
        data: share,
      });
    })
  );

  // Update share (mainly for marking as watched)
  app.patch(
    mountRoute + "/shares/:id",
    requireAuth,
    asyncHandler(async (req: RequestWithUser, res: Response) => {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user!.id;

      if (!isValidUUID(id)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_ID",
            message: "Invalid share ID format",
          },
        });
      }

      const allowedStatuses = ["watched", "archived"];
      if (status && !allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_STATUS",
            message: `Status must be one of: ${allowedStatuses.join(", ")}`,
          },
        });
      }

      const share = await Share.findById(id);

      if (!share) {
        return res.status(404).json({
          success: false,
          error: {
            code: "SHARE_NOT_FOUND",
            message: "Share not found",
          },
        });
      }

      // Check user permissions (only receiver can mark as watched, both can archive)
      if (status === "watched" && share.toUserId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Only the recipient can mark a share as watched",
          },
        });
      }

      if (status === "archived" && share.fromUserId.toString() !== userId && share.toUserId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You don't have permission to modify this share",
          },
        });
      }

      const updateData: any = {};
      if (status) {
        updateData.status = status;
      }

      const updatedShare = await Share.update(id, updateData);

      res.json({
        success: true,
        data: updatedShare,
      });
    })
  );

  // Delete/archive share
  app.delete(
    mountRoute + "/shares/:id",
    requireAuth,
    asyncHandler(async (req: RequestWithUser, res: Response) => {
      const { id } = req.params;
      const userId = req.user!.id;

      if (!isValidUUID(id)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_ID",
            message: "Invalid share ID format",
          },
        });
      }

      const share = await Share.findById(id);

      if (!share) {
        return res.status(404).json({
          success: false,
          error: {
            code: "SHARE_NOT_FOUND",
            message: "Share not found",
          },
        });
      }

      // Check user permissions (sender or receiver can delete)
      if (share.fromUserId.toString() !== userId && share.toUserId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You don't have permission to delete this share",
          },
        });
      }

      await Share.findByIdAndDelete(id);

      res.json({
        success: true,
        message: "Share deleted successfully",
      });
    })
  );
}
