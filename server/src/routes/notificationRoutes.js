import { Router } from "express";
import { createNotificationController } from "../controllers/notificationController.js";

export function createNotificationRouter(notificationService) {
  const router = Router();
  const controller = createNotificationController(notificationService);

  router.get("/", controller.getAll);
  router.patch("/:id/read", controller.markRead);
  router.post("/read-all", controller.markAllRead);

  return router;
}
