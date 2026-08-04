import { ListMembersRepository } from "../listMembersRepository.js";

export class InMemoryListMembersRepository extends ListMembersRepository {
  constructor() {
    super();
    this.members = [];
  }

  async invite(listId, inviteeEmail) {
    const existing = this.members.find(
      (m) => m.listId === listId && m.email === inviteeEmail
    );

    if (existing) {
      const err = new Error("User is already a member of this list");
      err.statusCode = 409;
      throw err;
    }

    const member = {
      id: crypto.randomUUID(),
      listId,
      userId: inviteeEmail,
      email: inviteeEmail,
      createdAt: new Date().toISOString()
    };

    this.members.push(member);
    return member;
  }

  async getMembers(listId) {
    return this.members.filter((m) => m.listId === listId);
  }

  async leave(userId, listId) {
    const index = this.members.findIndex((m) => m.userId === userId && m.listId === listId);
    if (index === -1) return false;
    this.members.splice(index, 1);
    return true;
  }

  async removeMember(listId, memberId) {
    const index = this.members.findIndex(
      (m) => m.id === memberId && m.listId === listId
    );

    if (index === -1) {
      return false;
    }

    this.members.splice(index, 1);
    return true;
  }

  async isMember(userId, listId) {
    return this.members.some((m) => m.listId === listId && m.userId === userId);
  }

  async getMemberListIds(userId) {
    return this.members.filter((m) => m.userId === userId).map((m) => m.listId);
  }
}
