import { z } from "zod";

const listSchema = z.object({
  name: z.string().trim().min(1).max(100)
});

const inviteSchema = z.object({
  email: z.string().email()
});

export function createListController(listService) {
  return {
    async getAll(req, res) {
      const lists = await listService.getLists(req.user.id);
      res.json({ data: lists });
    },

    async create(req, res) {
      const parsed = listSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid payload" });
      }

      const list = await listService.createList(req.user.id, parsed.data.name);
      return res.status(201).json({ data: list });
    },

    async remove(req, res) {
      const isDeleted = await listService.deleteList(req.user.id, req.params.id);

      if (!isDeleted) {
        return res.status(404).json({ error: "List not found" });
      }

      return res.status(204).send();
    },

    async getMembers(req, res) {
      const members = await listService.getMembers(req.params.id);
      res.json({ data: members });
    },

    async invite(req, res) {
      const parsed = inviteSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid email" });
      }

      try {
        const member = await listService.inviteMember(req.params.id, parsed.data.email, req.user.email);
        return res.status(201).json({ data: member });
      } catch (err) {
        return res.status(err.statusCode ?? 400).json({ error: err.message });
      }
    },

    async removeMember(req, res) {
      const isDeleted = await listService.removeMember(req.params.id, req.params.memberId);

      if (!isDeleted) {
        return res.status(404).json({ error: "Member not found" });
      }

      return res.status(204).send();
    }
  };
}
