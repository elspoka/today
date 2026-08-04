export function createListService(listRepository, listMembersRepository, notificationService = null) {
  return {
    async getLists(userId) {
      return listRepository.getAll(userId);
    },

    async createList(userId, name) {
      return listRepository.create(userId, name);
    },

    async deleteList(userId, id) {
      return listRepository.remove(userId, id);
    },

    async getMembers(listId) {
      return listMembersRepository.getMembers(listId);
    },

    async inviteMember(listId, email, inviterEmail = null) {
      const member = await listMembersRepository.invite(listId, email);

      if (notificationService && member?.userId) {
        try {
          const list = await listRepository.getById(listId);
          const listName = list?.name ?? "a list";
          const from = inviterEmail ?? "Someone";
          await notificationService.createNotification(
            member.userId,
            "list_shared",
            `${from} shared "${listName}" with you`,
            { listId, listName, from }
          );
        } catch {
          // notification failure is non-fatal
        }
      }

      return member;
    },

    async leaveList(userId, listId) {
      return listMembersRepository.leave(userId, listId);
    },

    async removeMember(listId, memberId) {
      return listMembersRepository.removeMember(listId, memberId);
    }
  };
}
