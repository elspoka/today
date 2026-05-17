export function createNotificationController(notificationService) {
  return {
    async getAll(req, res) {
      const notifications = await notificationService.getNotifications(req.user.id);
      res.json({ data: notifications });
    },

    async markRead(req, res) {
      await notificationService.markRead(req.params.id, req.user.id);
      res.status(204).send();
    },

    async markAllRead(req, res) {
      await notificationService.markAllRead(req.user.id);
      res.status(204).send();
    }
  };
}
