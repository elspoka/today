export function createTodoService(todoRepository, listMembersRepository) {
  return {
    async getTodos(userId, listId) {
      const memberListIds = await listMembersRepository.getMemberListIds(userId);
      return todoRepository.getAll(userId, listId, memberListIds);
    },

    async createTodo(userId, text, listId, dueDate = null) {
      return todoRepository.create(userId, text, listId, dueDate);
    },

    async updateTodo(userId, id, payload) {
      const memberListIds = await listMembersRepository.getMemberListIds(userId);
      return todoRepository.update(userId, id, payload, memberListIds);
    },

    async deleteTodo(userId, id) {
      const memberListIds = await listMembersRepository.getMemberListIds(userId);
      return todoRepository.remove(userId, id, memberListIds);
    }
  };
}
