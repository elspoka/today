import { request } from "./apiClient.js";

export function fetchLists() {
  return request("/lists");
}

export function createList(name) {
  return request("/lists", {
    method: "POST",
    body: JSON.stringify({ name })
  });
}

export function removeList(id) {
  return request(`/lists/${id}`, {
    method: "DELETE"
  });
}

export function fetchListMembers(listId) {
  return request(`/lists/${listId}/members`);
}

export function inviteToList(listId, email) {
  return request(`/lists/${listId}/members`, {
    method: "POST",
    body: JSON.stringify({ email })
  });
}

export function leaveList(id) {
  return request(`/lists/${id}/leave`, { method: 'DELETE' });
}

export function removeMember(listId, memberId) {
  return request(`/lists/${listId}/members/${memberId}`, {
    method: "DELETE"
  });
}
