import appRootPath from "app-root-path";
import dotenv from "dotenv";
import express from "express";
import path from "path";

import packageJson from "../package.json" with { type: "json" };
import { mountApi } from "./api.js";

dotenv.config();

const app = express();

mountApi("/api/v1", app);

app.use(express.urlencoded({ extended: true }));

app.set("view engine", "pug");
app.set("views", path.join(appRootPath.path, "views"));
app.use(express.static(path.join(appRootPath.path, "public")));

app.get("/", (_req, res) => {
  res.render("welcome-page");
});

app.get("/ping", (_req, res) => {
  res.send(`${packageJson.name} ${packageJson.version}`);
});

export { app };
