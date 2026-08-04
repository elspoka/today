import { request } from "./apiClient.js";

export function fetchNotifications() {
  return request("/notifications");
}

export function markNotificationRead(id) {
  return request(`/notifications/${id}/read`, { method: "PATCH" });
}

export function markAllNotificationsRead() {
  return request("/notifications/read-all", { method: "POST" });
}

export function deleteNotification(id) {
  return request(`/notifications/${id}`, { method: "DELETE" });
}
