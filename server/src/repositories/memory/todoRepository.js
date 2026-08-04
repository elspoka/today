import { TodoRepository } from "../todoRepository.js";

export class InMemoryTodoRepository extends TodoRepository {
  constructor() {
    super();
    this.todos = [];
  }

  async getAll(userId, listId = null, memberListIds = []) {
    return [...this.todos]
      .filter((item) => {
        if (listId !== null) {
          return item.listId === listId && (item.userId === userId || memberListIds.includes(item.listId));
        }
        return item.userId === userId || memberListIds.includes(item.listId);
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async create(userId, text, listId = null) {
    const todo = {
      id: crypto.randomUUID(),
      userId,
      text,
      completed: false,
      important: false,
      listId,
      createdAt: new Date().toISOString()
    };

    this.todos.push(todo);
    return todo;
  }

  async update(userId, id, payload, memberListIds = []) {
    const index = this.todos.findIndex(
      (item) => item.id === id && (item.userId === userId || memberListIds.includes(item.listId))
    );

    if (index === -1) {
      return null;
    }

    this.todos[index] = {
      ...this.todos[index],
      ...payload
    };

    return this.todos[index];
  }

  async remove(userId, id, memberListIds = []) {
    const index = this.todos.findIndex(
      (item) => item.id === id && (item.userId === userId || memberListIds.includes(item.listId))
    );

    if (index === -1) {
      return false;
    }

    this.todos.splice(index, 1);
    return true;
  }
}
