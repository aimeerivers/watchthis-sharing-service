import assert from "node:assert";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";

import mongoose from "mongoose";
import request from "supertest";

import { app } from "../src/app.js";

const port = 18372;
let server: Server;
describe("WatchThis Sharing Service App", () => {
  before(async () => {
    server = app.listen(port);

    // Wait for database connection to be ready
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => {
        mongoose.connection.once("connected", resolve);
      });
    }
  });

  after(async () => {
    return new Promise<void>((resolve) => {
      server.close(async () => {
        try {
          // Close the MongoDB connection to allow the test process to exit cleanly
          await mongoose.connection.close();
          console.log("Test cleanup completed");
        } catch (error) {
          console.error("Error during test cleanup:", error);
        } finally {
          resolve();
        }
      });
    });
  });

  describe("Home", () => {
    it("should show the sharing service home page", async () => {
      const res = await request(app).get("/");
      assert.ok(res.text.includes("WatchThis Sharing Service"));
    });
  });

  describe("Ping", () => {
    it("should respond to a ping", async () => {
      const res = await request(app).get("/ping");
      assert.equal(res.statusCode, 200);
    });
  });

  describe("Health", () => {
    it("should respond to health check", async () => {
      const res = await request(app).get("/health");
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.service, "watchthis-sharing-service");
    });
  });

  describe("API", () => {
    describe("Status", () => {
      it("should respond to a status request", async () => {
        const res = await request(app).get("/api/v1/status");
        assert.equal(res.statusCode, 200);
        assert.equal(res.body.status, "OK");
        assert.equal(res.body.message, "Sharing API is running");
      });
    });
  });
});
