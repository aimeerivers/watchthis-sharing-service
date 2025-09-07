import appRootPath from "app-root-path";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import path from "path";

import packageJson from "../package.json" with { type: "json" };
import { mountApi } from "./api.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

dotenv.config();

const mongoUrl = process.env.MONGO_URL ?? "mongodb://localhost:27017/sharing-service";
const mongoSharingService = `${mongoUrl}${process.env.NODE_ENV === "test" ? "-test" : ""}`;

mongoose
  .connect(mongoSharingService)
  .then(() => {
    console.log("Database connected!");
  })
  .catch((err: Error) => {
    console.log(err);
  });

const app = express();

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for TailwindCSS
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'"],
      },
    },
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mountApi("/api/v1", app);

app.set("view engine", "pug");
app.set("views", path.join(appRootPath.path, "views"));
app.use(express.static(path.join(appRootPath.path, "public")));

app.get("/", (_req, res) => {
  res.render("welcome-page", {
    serviceName: "WatchThis Sharing Service",
    description: "Handles media sharing between users",
  });
});

app.get("/ping", (_req, res) => {
  res.send(`${packageJson.name} ${packageJson.version}`);
});

app.get("/health", async (_req, res) => {
  try {
    // Check database connection
    if (mongoose.connection.db) {
      await mongoose.connection.db.admin().ping();
      res.json({
        service: packageJson.name,
        version: packageJson.version,
        status: "healthy",
        timestamp: new Date().toISOString(),
        database: "connected",
      });
    } else {
      throw new Error("Database not connected");
    }
  } catch (error) {
    res.status(503).json({
      service: packageJson.name,
      version: packageJson.version,
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      database: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Add error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

export { app };
