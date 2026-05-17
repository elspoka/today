import dotenv from "dotenv";
import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { rateLimit } from "express-rate-limit";
import { createRepositories } from "./repositories/index.js";
import { createAuthMiddleware } from "./middleware/authMiddleware.js";
import { getRuntimeSettings } from "./config/runtimeSettings.js";
import { runSetupCheck } from "./setupCheck.js";
import { createTodoService } from "./services/todoService.js";
import { createListService } from "./services/listService.js";
import { createNotificationService } from "./services/notificationService.js";
import { createTodoRouter } from "./routes/todoRoutes.js";
import { createListRouter } from "./routes/listRoutes.js";
import { createNotificationRouter } from "./routes/notificationRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const settings = getRuntimeSettings();

const PORT = Number(process.env.PORT ?? 3000);
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGIN ?? "http://localhost:5173,http://localhost:5174")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const { todos: todoRepository, lists: listRepository, listMembers: listMembersRepository, notifications: notificationRepository } = createRepositories();
const notificationService = createNotificationService(notificationRepository);
const todoService = createTodoService(todoRepository, listMembersRepository);
const listService = createListService(listRepository, listMembersRepository, notificationService);
const requireAuth = createAuthMiddleware(settings);

app.set("trust proxy", 1);
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: "10kb" }));
app.use(
  cors({
    origin: CLIENT_ORIGINS
  })
);
app.use(morgan("tiny"));
app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, dbProvider: settings.dbProvider, authMode: settings.authMode });
});

app.get("/api/setup-check", async (_req, res) => {
  const report = await runSetupCheck(settings);
  const statusCode = report.ok ? 200 : 503;
  return res.status(statusCode).json(report);
});

app.use("/api/todos", requireAuth, createTodoRouter(todoService));
app.use("/api/lists", requireAuth, createListRouter(listService));
app.use("/api/notifications", requireAuth, createNotificationRouter(notificationService));

app.use((err, _req, res, _next) => {
  console.error(err);
  const statusCode = err.statusCode ?? 500;
  const errorMessage =
    err.publicMessage ?? (process.env.NODE_ENV === "production" ? "Internal server error" : err.message);

  res.status(statusCode).json({ error: errorMessage });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
