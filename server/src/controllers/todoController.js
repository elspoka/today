import { z } from "zod";

const todoSchema = z.object({
  text: z.string().trim().min(1).max(200),
  listId: z.string().uuid().optional().nullable()
});

const todoUpdateSchema = z
  .object({
    text: z.string().trim().min(1).max(200).optional(),
    completed: z.boolean().optional(),
    important: z.boolean().optional()
  })
  .refine((payload) => payload.text !== undefined || payload.completed !== undefined || payload.important !== undefined, {
    message: "At least one property is required"
  });

export function createTodoController(todoService) {
  return {
    async getAll(req, res) {
      const todos = await todoService.getTodos(req.user.id, req.query.listId ?? null);
      res.json({ data: todos });
    },

    async create(req, res) {
      const parsed = todoSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid payload" });
      }

      const todo = await todoService.createTodo(req.user.id, parsed.data.text, parsed.data.listId ?? null);
      return res.status(201).json({ data: todo });
    },

    async update(req, res) {
      const parsed = todoUpdateSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid payload" });
      }

      const updated = await todoService.updateTodo(req.user.id, req.params.id, parsed.data);

      if (!updated) {
        return res.status(404).json({ error: "Todo not found" });
      }

      return res.json({ data: updated });
    },

    async remove(req, res) {
      const isDeleted = await todoService.deleteTodo(req.user.id, req.params.id);

      if (!isDeleted) {
        return res.status(404).json({ error: "Todo not found" });
      }

      return res.status(204).send();
    }
  };
}
