import { ListRepository } from "../listRepository.js";

export class InMemoryListRepository extends ListRepository {
  constructor(membersRepo = null) {
    super();
    this.lists = [];
    this.membersRepo = membersRepo;
  }

  async getAll(userId) {
    const owned = [...this.lists]
      .filter((item) => item.userId === userId)
      .map((item) => ({ ...item, isOwner: true, ownerId: item.userId }));

    if (!this.membersRepo) {
      return owned.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    }

    const memberListIds = await this.membersRepo.getMemberListIds(userId);
    const ownedIds = new Set(owned.map((l) => l.id));

    const shared = [...this.lists]
      .filter((item) => memberListIds.includes(item.id) && !ownedIds.has(item.id))
      .map((item) => ({ ...item, isOwner: false, ownerId: item.userId }));

    return [...owned, ...shared].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  }

  async create(userId, name) {
    const list = {
      id: crypto.randomUUID(),
      userId,
      name,
      createdAt: new Date().toISOString()
    };
    this.lists.push(list);
    return { ...list, isOwner: true, ownerId: userId };
  }

  async remove(userId, id) {
    const index = this.lists.findIndex((item) => item.id === id && item.userId === userId);
    if (index === -1) {
      return false;
    }
    this.lists.splice(index, 1);
    return true;
  }

  async getById(id) {
    return this.lists.find((l) => l.id === id) ?? null;
  }
}
