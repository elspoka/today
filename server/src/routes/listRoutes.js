import { Router } from "express";
import { createListController } from "../controllers/listController.js";

export function createListRouter(listService) {
  const router = Router();
  const controller = createListController(listService);

  router.get("/", controller.getAll);
  router.post("/", controller.create);
  router.delete("/:id", controller.remove);
  router.delete("/:id/leave", controller.leave);
  router.get("/:id/members", controller.getMembers);
  router.post("/:id/members", controller.invite);
  router.delete("/:id/members/:memberId", controller.removeMember);

  return router;
}
