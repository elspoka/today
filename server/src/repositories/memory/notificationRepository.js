import { NotificationRepository } from "../notificationRepository.js";

export class InMemoryNotificationRepository extends NotificationRepository {
  constructor() {
    super();
    this.notifications = [];
  }

  async getForUser(userId) {
    return [...this.notifications]
      .filter((n) => n.userId === userId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async create(userId, type, message, metadata = null) {
    const notification = {
      id: crypto.randomUUID(),
      userId,
      type,
      message,
      read: false,
      metadata,
      createdAt: new Date().toISOString()
    };
    this.notifications.push(notification);
    return notification;
  }

  async markRead(notificationId, userId) {
    const n = this.notifications.find((n) => n.id === notificationId && n.userId === userId);
    if (!n) return false;
    n.read = true;
    return true;
  }

  async markAllRead(userId) {
    this.notifications.filter((n) => n.userId === userId).forEach((n) => (n.read = true));
    return true;
  }
}
