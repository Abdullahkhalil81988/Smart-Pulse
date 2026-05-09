import { auth } from "../../firebase-config";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

/**
 * Wrapper around fetch that automatically attaches the
 * current Firebase ID token as a Bearer Authorization header.
 */
async function request<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // If the body is JSON (not FormData / Blob), set Content-Type
  if (options.body && typeof options.body === "string") {
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
  }

  // Attach Firebase ID token if a user is signed in
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Try to parse JSON; fall back to text
  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await res.json()
    : await res.text();

  if (!res.ok) {
    const message =
<<<<<<< HEAD
      typeof data === "object" && data !== null && "error" in data
        ? (data as { error: string }).error
=======
      typeof data === "object" && data !== null
        ? (data as any).error || (data as any).detail || JSON.stringify(data)
>>>>>>> 6eab19e008cd1df2c74fa13d07ce9e114dd1d8f3
        : String(data);
    throw new Error(message);
  }

  return data as T;
}

/* ─── convenience wrappers ───────────────────────────────── */

export const api = {
  get: <T = unknown>(endpoint: string) =>
    request<T>(endpoint, { method: "GET" }),

  post: <T = unknown>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: "POST",
      body: body != null ? JSON.stringify(body) : undefined,
    }),

  put: <T = unknown>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: "PUT",
      body: body != null ? JSON.stringify(body) : undefined,
    }),

  patch: <T = unknown>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: "PATCH",
      body: body != null ? JSON.stringify(body) : undefined,
    }),

  delete: <T = unknown>(endpoint: string) =>
    request<T>(endpoint, { method: "DELETE" }),

  /** For multipart/form-data uploads (e.g. CSV).
   *  Do NOT set Content-Type — the browser adds the boundary automatically. */
  upload: <T = unknown>(endpoint: string, formData: FormData) =>
    request<T>(endpoint, { method: "POST", body: formData as unknown as BodyInit }),
};

export default api;
