import assert from "node:assert";
import crypto from "node:crypto";
import type { Server } from "node:http";
import { after, before, beforeEach, describe, it } from "node:test";

import request from "supertest";

import { app, prisma } from "../src/app.js";
import { Share } from "../src/models/share.js";
import { authenticateAs, clearUserServiceMocks, testData, testUsers } from "./helpers/auth.js";

const port = 18373; // Different port to avoid conflicts
let server: Server;

describe("WatchThis Sharing Service - CRUD API", () => {
  before(async () => {
    server = app.listen(port);

    // Wait for database connection to be ready
    await prisma.$connect();

    // Clean up any existing test data
    await Share.deleteMany({});
  });

  beforeEach(() => {
    // Clear all HTTP mocks before each test
    clearUserServiceMocks();
  });

  after(async () => {
    clearUserServiceMocks();
    return new Promise<void>((resolve) => {
      server.close(async () => {
        try {
          // Clean up test data before closing connection
          await Share.deleteMany({});

          // Close the database connection to allow the test process to exit cleanly
          await prisma.$disconnect();
          console.log("CRUD test cleanup completed");
        } catch (error) {
          console.error("Error during CRUD test cleanup:", error);
        } finally {
          resolve();
        }
      });
    });
  });

  describe("POST /api/v1/shares - Create Share", () => {
    it("should create a new share with valid data", async () => {
      const auth = authenticateAs(testUsers.user1);

      const shareData = {
        mediaId: testData.validMediaId.toString(),
        toUserId: testData.validToUserId.toString(),
        message: testData.validMessage,
      };

      const res = await request(app)
        .post("/api/v1/shares")
        .set("Authorization", auth.authHeader)
        .send(shareData)
        .expect(201);

      assert.equal(res.body.success, true);
      assert.ok(res.body.data);
      assert.equal(res.body.data.mediaId, shareData.mediaId);
      assert.equal(res.body.data.fromUserId, testUsers.user1.id);
      assert.equal(res.body.data.toUserId, shareData.toUserId);
      assert.equal(res.body.data.message, shareData.message);
      assert.equal(res.body.data.status, "pending");
      assert.ok(res.body.data.id);
      assert.ok(res.body.data.createdAt);
      assert.ok(res.body.data.updatedAt);
    });

    it("should create a share without message", async () => {
      const auth = authenticateAs(testUsers.user1);

      const shareData = {
        mediaId: testData.validMediaId.toString(),
        toUserId: testData.anotherUserId.toString(),
      };

      const res = await request(app)
        .post("/api/v1/shares")
        .set("Authorization", auth.authHeader)
        .send(shareData)
        .expect(201);

      assert.equal(res.body.success, true);
      assert.equal(res.body.data.message, undefined);
    });

    it("should fail when mediaId is missing", async () => {
      const auth = authenticateAs(testUsers.user1);

      const shareData = {
        toUserId: testData.validToUserId.toString(),
      };

      const res = await request(app)
        .post("/api/v1/shares")
        .set("Authorization", auth.authHeader)
        .send(shareData)
        .expect(400);

      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "MISSING_FIELDS");
    });

    it("should fail when not authenticated", async () => {
      const shareData = {
        mediaId: testData.validMediaId.toString(),
        toUserId: testData.validToUserId.toString(),
      };

      const res = await request(app).post("/api/v1/shares").send(shareData).expect(401);

      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "AUTHENTICATION_REQUIRED");
    });

    it("should fail when toUserId is missing", async () => {
      const auth = authenticateAs(testUsers.user1);

      const shareData = {
        mediaId: testData.validMediaId.toString(),
      };

      const res = await request(app)
        .post("/api/v1/shares")
        .set("Authorization", auth.authHeader)
        .send(shareData)
        .expect(400);

      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "MISSING_FIELDS");
    });

    it("should fail when user tries to share with themselves", async () => {
      const auth = authenticateAs(testUsers.user1);

      const shareData = {
        mediaId: testData.validMediaId.toString(),
        toUserId: testUsers.user1.id, // Same as authenticated user
      };

      const res = await request(app)
        .post("/api/v1/shares")
        .set("Authorization", auth.authHeader)
        .send(shareData)
        .expect(400);

      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "INVALID_SHARE");
    });

    it("should trim whitespace from message", async () => {
      const auth = authenticateAs(testUsers.user1);

      const shareData = {
        mediaId: testData.validMediaId.toString(),
        toUserId: testData.validToUserId.toString(),
        message: "  Trimmed message  ",
      };

      const res = await request(app)
        .post("/api/v1/shares")
        .set("Authorization", auth.authHeader)
        .send(shareData)
        .expect(201);

      assert.equal(res.body.data.message, "Trimmed message");
    });
  });

  describe("GET /api/v1/shares/:id - Get Share by ID", () => {
    let testShareId: string;

    before(async () => {
      // Create a test share
      const savedShare = await Share.create({
        mediaId: testData.validMediaId,
        fromUserId: testData.validFromUserId,
        toUserId: testData.validToUserId,
        message: "Test share for GET",
      });
      testShareId = savedShare.id;
    });

    it("should get share by valid ID", async () => {
      const auth = authenticateAs(testUsers.user1);

      const res = await request(app)
        .get(`/api/v1/shares/${testShareId}`)
        .set("Authorization", auth.authHeader)
        .expect(200);

      assert.equal(res.body.success, true);
      assert.equal(res.body.data.id, testShareId);
      assert.equal(res.body.data.message, "Test share for GET");
      assert.equal(res.body.data.status, "pending");
    });

    it("should fail with invalid ID format", async () => {
      const auth = authenticateAs(testUsers.user1);

      const res = await request(app)
        .get(`/api/v1/shares/${testData.invalidId}`)
        .set("Authorization", auth.authHeader)
        .expect(400);

      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "INVALID_ID");
    });

    it("should fail with non-existent ID", async () => {
      const auth = authenticateAs(testUsers.user1);
      const nonExistentId = crypto.randomUUID();

      const res = await request(app)
        .get(`/api/v1/shares/${nonExistentId}`)
        .set("Authorization", auth.authHeader)
        .expect(404);

      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "SHARE_NOT_FOUND");
    });
  });

  describe("PATCH /api/v1/shares/:id - Update Share", () => {
    let testShareId: string;

    before(async () => {
      // Create a test share where user2 sends to user1
      // So when user1 authenticates, they can mark it as watched (recipient permission)
      const savedShare = await Share.create({
        mediaId: testData.validMediaId,
        fromUserId: testUsers.user2.id, // user2 sends
        toUserId: testUsers.user1.id, // user1 receives
        message: "Test share for PATCH",
      });
      testShareId = savedShare.id;
    });

    it("should mark share as watched", async () => {
      const auth = authenticateAs(testUsers.user1);

      const res = await request(app)
        .patch(`/api/v1/shares/${testShareId}`)
        .set("Authorization", auth.authHeader)
        .send({ status: "watched" })
        .expect(200);

      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, "watched");
      assert.ok(res.body.data.watchedAt);
    });

    it("should mark share as archived", async () => {
      const auth = authenticateAs(testUsers.user1);

      const res = await request(app)
        .patch(`/api/v1/shares/${testShareId}`)
        .set("Authorization", auth.authHeader)
        .send({ status: "archived" })
        .expect(200);

      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, "archived");
    });

    it("should fail with invalid status", async () => {
      const auth = authenticateAs(testUsers.user1);

      const res = await request(app)
        .patch(`/api/v1/shares/${testShareId}`)
        .set("Authorization", auth.authHeader)
        .send({ status: "invalid-status" })
        .expect(400);

      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "INVALID_STATUS");
    });

    it("should fail with invalid ID format", async () => {
      const auth = authenticateAs(testUsers.user1);

      const res = await request(app)
        .patch(`/api/v1/shares/${testData.invalidId}`)
        .set("Authorization", auth.authHeader)
        .send({ status: "watched" })
        .expect(400);

      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "INVALID_ID");
    });

    it("should fail with non-existent ID", async () => {
      const auth = authenticateAs(testUsers.user1);
      const nonExistentId = crypto.randomUUID();

      const res = await request(app)
        .patch(`/api/v1/shares/${nonExistentId}`)
        .set("Authorization", auth.authHeader)
        .send({ status: "watched" })
        .expect(404);

      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "SHARE_NOT_FOUND");
    });
  });

  describe("DELETE /api/v1/shares/:id - Delete Share", () => {
    let testShareId: string;

    beforeEach(async () => {
      // Create a fresh test share for each delete test
      const savedShare = await Share.create({
        mediaId: testData.validMediaId,
        fromUserId: testData.validFromUserId,
        toUserId: testData.validToUserId,
        message: "Test share for DELETE",
      });
      testShareId = savedShare.id;
    });

    it("should delete share by valid ID", async () => {
      const auth = authenticateAs(testUsers.user1);

      const res = await request(app)
        .delete(`/api/v1/shares/${testShareId}`)
        .set("Authorization", auth.authHeader)
        .expect(200);

      assert.equal(res.body.success, true);
      assert.ok(res.body.message);

      // Verify share is actually deleted
      const deletedShare = await Share.findById(testShareId);
      assert.equal(deletedShare, null);
    });

    it("should fail with invalid ID format", async () => {
      const auth = authenticateAs(testUsers.user1);

      const res = await request(app)
        .delete(`/api/v1/shares/${testData.invalidId}`)
        .set("Authorization", auth.authHeader)
        .expect(400);

      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "INVALID_ID");
    });

    it("should fail with non-existent ID", async () => {
      const auth = authenticateAs(testUsers.user1);
      const nonExistentId = crypto.randomUUID();

      const res = await request(app)
        .delete(`/api/v1/shares/${nonExistentId}`)
        .set("Authorization", auth.authHeader)
        .expect(404);

      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "SHARE_NOT_FOUND");
    });
  });

  describe("GET /api/v1/shares/sent - Get Sent Shares", () => {
    before(async () => {
      // Clean up and create test data
      await Share.deleteMany({});

      // Create shares from our test user
      await Share.createMany({
        data: [
          {
            mediaId: testData.validMediaId,
            fromUserId: testUsers.user1.id,
            toUserId: testUsers.user2.id,
            message: "Sent share 1",
            status: "pending",
          },
          {
            mediaId: testData.validMediaId,
            fromUserId: testUsers.user1.id,
            toUserId: testUsers.user2.id,
            message: "Sent share 2",
            status: "watched",
          },
          {
            mediaId: testData.validMediaId,
            fromUserId: testUsers.user2.id, // Different sender
            toUserId: testUsers.user1.id,
            message: "Not our share",
            status: "pending",
          },
        ],
      });
    });

    it("should get all sent shares for user", async () => {
      const auth = authenticateAs(testUsers.user1);

      const res = await request(app).get("/api/v1/shares/sent").set("Authorization", auth.authHeader).expect(200);

      assert.equal(res.body.success, true);
      assert.equal(res.body.data.length, 2);
      assert.ok(res.body.pagination);
      assert.equal(res.body.pagination.total, 2);
    });

    it("should filter sent shares by status", async () => {
      const auth = authenticateAs(testUsers.user1);

      const res = await request(app)
        .get("/api/v1/shares/sent")
        .set("Authorization", auth.authHeader)
        .query({ status: "pending" })
        .expect(200);

      assert.equal(res.body.success, true);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].status, "pending");
    });

    it("should handle pagination", async () => {
      const auth = authenticateAs(testUsers.user1);

      const res = await request(app)
        .get("/api/v1/shares/sent")
        .set("Authorization", auth.authHeader)
        .query({
          page: 1,
          limit: 1,
        })
        .expect(200);

      assert.equal(res.body.success, true);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.pagination.page, 1);
      assert.equal(res.body.pagination.limit, 1);
      assert.equal(res.body.pagination.hasNext, true);
    });

    it("should fail when not authenticated", async () => {
      const res = await request(app).get("/api/v1/shares/sent").expect(401);

      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "AUTHENTICATION_REQUIRED");
    });
  });

  describe("GET /api/v1/shares/received - Get Received Shares", () => {
    before(async () => {
      // Clean up and create test data
      await Share.deleteMany({});

      // Create shares received by our test user
      await Share.createMany({
        data: [
          {
            mediaId: testData.validMediaId,
            fromUserId: testUsers.user2.id,
            toUserId: testUsers.user1.id, // Our test user receives
            message: "Received share 1",
            status: "pending",
          },
          {
            mediaId: testData.validMediaId,
            fromUserId: testUsers.user2.id,
            toUserId: testUsers.user1.id, // Our test user receives
            message: "Received share 2",
            status: "watched",
          },
          {
            mediaId: testData.validMediaId,
            fromUserId: testUsers.user1.id,
            toUserId: testUsers.user2.id, // Different receiver
            message: "Not our share",
            status: "pending",
          },
        ],
      });
    });

    it("should get all received shares for user", async () => {
      const auth = authenticateAs(testUsers.user1);

      const res = await request(app).get("/api/v1/shares/received").set("Authorization", auth.authHeader).expect(200);

      assert.equal(res.body.success, true);
      assert.equal(res.body.data.length, 2);
      assert.ok(res.body.pagination);
      assert.equal(res.body.pagination.total, 2);
    });

    it("should filter received shares by status", async () => {
      const auth = authenticateAs(testUsers.user1);

      const res = await request(app)
        .get("/api/v1/shares/received")
        .set("Authorization", auth.authHeader)
        .query({ status: "pending" })
        .expect(200);

      assert.equal(res.body.success, true);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].status, "pending");
    });

    it("should fail when not authenticated", async () => {
      const res = await request(app).get("/api/v1/shares/received").expect(401);

      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "AUTHENTICATION_REQUIRED");
    });
  });

  describe("GET /api/v1/shares/stats - Get Sharing Statistics", () => {
    before(async () => {
      // Clean up and create test data
      await Share.deleteMany({});

      // Create various shares for statistics
      await Share.createMany({
        data: [
          // Sent by test user
          {
            mediaId: testData.validMediaId,
            fromUserId: testUsers.user1.id,
            toUserId: testUsers.user2.id,
            status: "pending",
          },
          {
            mediaId: testData.validMediaId,
            fromUserId: testUsers.user1.id,
            toUserId: testUsers.user2.id,
            status: "watched",
          },
          {
            mediaId: testData.validMediaId,
            fromUserId: testUsers.user1.id,
            toUserId: testUsers.user2.id,
            status: "archived",
          },
          // Received by test user
          {
            mediaId: testData.validMediaId,
            fromUserId: testUsers.user2.id,
            toUserId: testUsers.user1.id,
            status: "pending",
          },
          {
            mediaId: testData.validMediaId,
            fromUserId: testUsers.user2.id,
            toUserId: testUsers.user1.id,
            status: "watched",
          },
        ],
      });
    });

    it("should get sharing statistics for user", async () => {
      const auth = authenticateAs(testUsers.user1);

      const res = await request(app).get("/api/v1/shares/stats").set("Authorization", auth.authHeader).expect(200);

      assert.equal(res.body.success, true);
      assert.ok(res.body.data.sent);
      assert.ok(res.body.data.received);

      // Check sent stats
      assert.equal(res.body.data.sent.total, 3);
      assert.equal(res.body.data.sent.pending, 1);
      assert.equal(res.body.data.sent.watched, 1);
      assert.equal(res.body.data.sent.archived, 1);

      // Check received stats
      assert.equal(res.body.data.received.total, 2);
      assert.equal(res.body.data.received.pending, 1);
      assert.equal(res.body.data.received.watched, 1);
      assert.equal(res.body.data.received.archived, 0);
    });

    it("should fail when not authenticated", async () => {
      const res = await request(app).get("/api/v1/shares/stats").expect(401);

      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, "AUTHENTICATION_REQUIRED");
    });
  });
});
