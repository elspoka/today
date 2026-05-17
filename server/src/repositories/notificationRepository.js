export class NotificationRepository {
  async getForUser(_userId) {
    throw new Error("Not implemented");
  }

  async create(_userId, _type, _message, _metadata) {
    throw new Error("Not implemented");
  }

  async markRead(_notificationId, _userId) {
    throw new Error("Not implemented");
  }

  async markAllRead(_userId) {
    throw new Error("Not implemented");
  }
}
