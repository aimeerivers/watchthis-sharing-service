import { Express } from "express";

export function mountApi(mountRoute: string, app: Express): void {
  app.get(mountRoute + "/status", (_req, res) => {
    res.json({ status: "OK", message: "API is running" });
  });
}
