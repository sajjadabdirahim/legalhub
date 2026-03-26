/**
 * Use 127.0.0.1 (not "localhost") by default: on many Windows setups "localhost" resolves to
 * IPv6 ::1 first while uvicorn is often bound only to 127.0.0.1 — then fetch() fails with
 * "Failed to fetch" even though the API is running.
 */
const DEFAULT_API_BASE = "http://127.0.0.1:8000";

export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (typeof raw === "string" && raw.trim()) {
    return raw.replace(/\/$/, "");
  }
  return DEFAULT_API_BASE;
}

const TOKEN_KEY = "legalhub_access_token";

export function getStoredAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredAccessToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export type ChatMode = "citizen" | "professional";

export async function postChat(query: string, mode: ChatMode): Promise<{
  user_input: string;
  sanitized_input: string;
  user_id: string;
  mode: ChatMode;
}> {
  const token = getStoredAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }
  const res = await fetch(`${getApiBaseUrl()}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, mode }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    detail?: string | { msg: string }[];
    user_input?: string;
    sanitized_input?: string;
    user_id?: string;
    mode?: ChatMode;
  };
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    if (typeof data.detail === "string") message = data.detail;
    else if (Array.isArray(data.detail) && data.detail[0]?.msg) {
      message = data.detail.map((d) => d.msg).join("; ");
    }
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  if (
    typeof data.user_input !== "string" ||
    typeof data.sanitized_input !== "string" ||
    typeof data.user_id !== "string" ||
    (data.mode !== "citizen" && data.mode !== "professional")
  ) {
    throw new Error("Invalid response from server.");
  }
  return {
    user_input: data.user_input,
    sanitized_input: data.sanitized_input,
    user_id: data.user_id,
    mode: data.mode,
  };
}
