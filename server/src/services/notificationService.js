export function createNotificationService(notificationRepository) {
  return {
    async getNotifications(userId) {
      return notificationRepository.getForUser(userId);
    },

    async createNotification(userId, type, message, metadata = null) {
      return notificationRepository.create(userId, type, message, metadata);
    },

    async markRead(notificationId, userId) {
      return notificationRepository.markRead(notificationId, userId);
    },

    async markAllRead(userId) {
      return notificationRepository.markAllRead(userId);
    }
  };
}
