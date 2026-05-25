import { authService } from "./authService.js";

const API_BASE = "/api";

export async function request(path, options = {}) {
  const token = await authService.getAccessToken();

  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    ...options
  });

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(body?.error || "Request failed");
  }

  return body?.data ?? null;
}
