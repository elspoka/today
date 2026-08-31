import { Router } from "express";
import { createWebhookController } from "../controllers/webhookController.js";

export function createWebhookRouter(settings) {
  const router = Router();
  const controller = createWebhookController(settings);

  router.get("/messenger", controller.verifyMessenger);
  router.post("/messenger", controller.receiveMessenger);

  return router;
}
