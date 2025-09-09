import type { Express, Response } from "express";
import mongoose from "mongoose";

import { type RequestWithUser, requireAuth } from "./middleware/auth.js";
import { Share } from "./models/share.js";
import { asyncHandler } from "./utils/asyncHandler.js";

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
      const fromUserId = req.user!._id;

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

      // Prevent self-sharing
      if (fromUserId === toUserId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_SHARE",
            message: "Cannot share with yourself",
          },
        });
      }

      // TODO: Validate user IDs exist via user service
      // TODO: Validate media ID exists via media service
      // TODO: Check if users are friends/allowed to share

      const share = new Share({
        mediaId,
        fromUserId,
        toUserId,
        message: message?.trim(),
      });

      await share.save();

      res.status(201).json({
        success: true,
        data: share.toJSON(),
      });
    })
  );

  // Get shares sent by user - MUST be before /:id route
  app.get(
    mountRoute + "/shares/sent",
    requireAuth,
    asyncHandler(async (req: RequestWithUser, res: Response) => {
      // Get userId from authenticated session
      const userId = req.user!._id;

      const { status, page = 1, limit = 20 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const filter: any = { fromUserId: userId };
      if (status && status !== "all") {
        filter.status = status;
      }

      const shares = await Share.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit));

      const total = await Share.countDocuments(filter);

      res.json({
        success: true,
        data: shares.map((share) => share.toJSON()),
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
      const userId = req.user!._id;

      const { status, page = 1, limit = 20 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const filter: any = { toUserId: userId };
      if (status && status !== "all") {
        filter.status = status;
      }

      const shares = await Share.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit));

      const total = await Share.countDocuments(filter);

      res.json({
        success: true,
        data: shares.map((share) => share.toJSON()),
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
      const userId = req.user!._id;

      const [sentStats, receivedStats] = await Promise.all([
        Share.aggregate([
          { $match: { fromUserId: new mongoose.Types.ObjectId(userId as string) } },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ]),
        Share.aggregate([
          { $match: { toUserId: new mongoose.Types.ObjectId(userId as string) } },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

      const formatStats = (stats: any[]) => {
        const result = { pending: 0, watched: 0, archived: 0, total: 0 };
        stats.forEach((stat) => {
          result[stat._id as keyof typeof result] = stat.count;
          result.total += stat.count;
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
      const userId = req.user!._id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
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
        data: share.toJSON(),
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
      const userId = req.user!._id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
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

      if (status) {
        share.status = status;
      }

      await share.save();

      res.json({
        success: true,
        data: share.toJSON(),
      });
    })
  );

  // Delete/archive share
  app.delete(
    mountRoute + "/shares/:id",
    requireAuth,
    asyncHandler(async (req: RequestWithUser, res: Response) => {
      const { id } = req.params;
      const userId = req.user!._id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
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
