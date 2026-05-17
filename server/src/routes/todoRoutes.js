import { Router } from "express";
import { createTodoController } from "../controllers/todoController.js";

export function createTodoRouter(todoService) {
  const router = Router();
  const controller = createTodoController(todoService);

  router.get("/", controller.getAll);
  router.post("/", controller.create);
  router.patch("/:id", controller.update);
  router.delete("/:id", controller.remove);

  return router;
}
