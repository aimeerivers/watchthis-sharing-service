import mongoose from "mongoose";

import { app } from "./app.js";

const port = process.env.PORT || (process.env.NODE_ENV === "test" ? 18372 : 8372);

const server = app.listen(port, () => {
  console.log(`watchthis-sharing-service listening at http://localhost:${port}`);
});

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}, shutting down gracefully...`);

  server.close(async () => {
    console.log("HTTP server closed");

    try {
      await mongoose.connection.close();
      console.log("Database connection closed");
    } catch (error) {
      console.error("Error closing database connection:", error);
    }

    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error("Could not close connections in time, forcefully shutting down");
    process.exit(1);
  }, 10000);
};

// Listen for termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export { server };
