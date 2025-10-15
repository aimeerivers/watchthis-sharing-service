import { type Prisma, type Share as PrismaShare } from "@prisma/client";

import { prisma } from "../app.js";

export interface IShare {
  id: string;
  mediaId: string;
  fromUserId: string;
  toUserId: string;
  message?: string | null;
  status: "pending" | "watched" | "archived";
  watchedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Share {
  static async findById(id: string): Promise<PrismaShare | null> {
    return await prisma.share.findUnique({
      where: { id },
    });
  }

  static async findOne(where: Prisma.ShareWhereInput): Promise<PrismaShare | null> {
    return await prisma.share.findFirst({
      where,
    });
  }

  static async find(where?: Prisma.ShareWhereInput): Promise<PrismaShare[]> {
    return await prisma.share.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  static async create(data: Prisma.ShareCreateInput): Promise<PrismaShare> {
    // Handle watchedAt middleware: set watchedAt if status is "watched"
    const shareData = {
      ...data,
      watchedAt: data.status === "watched" ? new Date() : data.watchedAt,
    };

    return await prisma.share.create({
      data: shareData,
    });
  }

  static async createMany(data: Prisma.ShareCreateManyInput[]): Promise<{ count: number }> {
    // Handle watchedAt middleware for bulk creation
    const processedData = data.map((share) => ({
      ...share,
      watchedAt: share.status === "watched" ? new Date() : share.watchedAt,
    }));

    return await prisma.share.createMany({
      data: processedData,
    });
  }

  static async update(id: string, data: Prisma.ShareUpdateInput): Promise<PrismaShare | null> {
    try {
      // Handle watchedAt middleware: set watchedAt if status is changing to "watched"
      const updateData = { ...data };
      if (data.status === "watched" && !data.watchedAt) {
        updateData.watchedAt = new Date();
      }

      return await prisma.share.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "P2025") {
        return null; // Record not found
      }
      throw error;
    }
  }

  static async findByIdAndUpdate(id: string, data: Prisma.ShareUpdateInput): Promise<PrismaShare | null> {
    return await this.update(id, data);
  }

  static async deleteMany(where?: Prisma.ShareWhereInput): Promise<{ count: number }> {
    return await prisma.share.deleteMany({
      where,
    });
  }

  static async countDocuments(where?: Prisma.ShareWhereInput): Promise<number> {
    return await prisma.share.count({
      where,
    });
  }

  static async findByIdAndDelete(id: string): Promise<PrismaShare | null> {
    try {
      return await prisma.share.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "P2025") {
        return null; // Record not found
      }
      throw error;
    }
  }

  // Specific queries for sharing service
  static async findUserShares(
    userId: string,
    options: {
      status?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<PrismaShare[]> {
    const { status, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    return await prisma.share.findMany({
      where: {
        toUserId: userId,
        ...(status && { status }),
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });
  }

  static async findUserSentShares(
    userId: string,
    options: {
      status?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<PrismaShare[]> {
    const { status, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    return await prisma.share.findMany({
      where: {
        fromUserId: userId,
        ...(status && { status }),
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });
  }
}
