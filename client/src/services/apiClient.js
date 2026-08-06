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
  const contentType = response.headers.get("content-type") || "";
  let body = null;

  if (text) {
    if (contentType.includes("application/json")) {
      try {
        body = JSON.parse(text);
      } catch {
        throw new Error("Server returned invalid JSON");
      }
    } else {
      throw new Error("Server returned an unexpected response format");
    }
  }

  if (!response.ok) {
    throw new Error(body?.error || "Request failed");
  }

  return body?.data ?? null;
}
