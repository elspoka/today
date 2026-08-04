export class ListMembersRepository {
  async invite(_listId, _inviteeEmail) {
    throw new Error("Not implemented");
  }

  async getMembers(_listId) {
    throw new Error("Not implemented");
  }

  async removeMember(_listId, _memberId) {
    throw new Error("Not implemented");
  }

  async leave(_userId, _listId) {
    throw new Error("Not implemented");
  }

  async isMember(_userId, _listId) {
    throw new Error("Not implemented");
  }

  async getMemberListIds(_userId) {
    throw new Error("Not implemented");
  }
}
