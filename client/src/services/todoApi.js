import { request } from "./apiClient.js";

export function fetchTodos(listId = null) {
  const qs = listId ? `?listId=${encodeURIComponent(listId)}` : "";
  return request(`/todos${qs}`);
}

export function createTodo(text, listId = null, dueDate = null) {
  return request("/todos", {
    method: "POST",
    body: JSON.stringify({ text, listId, dueDate })
  });
}

export function patchTodo(id, payload) {
  return request(`/todos/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function removeTodo(id) {
  return request(`/todos/${id}`, {
    method: "DELETE"
  });
}
