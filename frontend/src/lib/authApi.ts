import { getApiBaseUrl, setStoredAccessToken } from "@/lib/api";

export type AuthOutcome =
  | { ok: true; email: string }
  | { ok: false; message: string };

function detailMessage(data: { detail?: unknown }, status?: number): string {
  const d = data.detail;
  if (typeof d === "string") {
    if (status) return `${d} (HTTP ${status})`;
    return d;
  }
  if (Array.isArray(d) && d[0] && typeof (d[0] as { msg?: string }).msg === "string") {
    const msg = (d[0] as { msg: string }).msg;
    if (status) return `${msg} (HTTP ${status})`;
    return msg;
  }
  if (status) return `Request failed (HTTP ${status}).`;
  return "Request failed.";
}

async function postJson(url: string, body: object): Promise<{ res: Response; data: Record<string, unknown> }> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const base = getApiBaseUrl();
    if (e instanceof TypeError) {
      const detail =
      `Cannot reach the API at ${base}. If uvicorn is running, try: (1) set VITE_API_BASE_URL=http://127.0.0.1:8000 in the repo root .env (avoid "localhost" on Windows), ` +
      `(2) run uvicorn with --host 0.0.0.0 so both IPv4 and IPv6 can connect, (3) check the browser Network tab for blocked/CORS errors.`;
      const res = new Response(JSON.stringify({ detail }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
      return { res, data: { detail } };
    }
    throw e;
  }
  const data = (await res.json().catch(async () => {
    const text = await res.text().catch(() => "");
    return text ? ({ detail: text } as Record<string, unknown>) : ({} as Record<string, unknown>);
  })) as Record<string, unknown>;
  return { res, data };
}

export async function registerWithPassword(email: string, password: string): Promise<AuthOutcome> {
  const { res, data } = await postJson(`${getApiBaseUrl()}/api/auth/register`, { email, password });
  if (!res.ok) {
    return { ok: false, message: detailMessage(data, res.status) };
  }
  const token = data.access_token;
  const em = data.email;
  if (typeof token !== "string" || typeof em !== "string") {
    return { ok: false, message: "Invalid response from server." };
  }
  setStoredAccessToken(token);
  return { ok: true, email: em };
}

export async function loginWithPassword(email: string, password: string): Promise<AuthOutcome> {
  const { res, data } = await postJson(`${getApiBaseUrl()}/api/auth/login`, { email, password });
  if (!res.ok) {
    return { ok: false, message: detailMessage(data, res.status) };
  }
  const token = data.access_token;
  const em = data.email;
  if (typeof token !== "string" || typeof em !== "string") {
    return { ok: false, message: "Invalid response from server." };
  }
  setStoredAccessToken(token);
  return { ok: true, email: em };
}

export async function loginWithGoogleCredential(
  credential?: string,
  devEmail?: string
): Promise<AuthOutcome> {
  const body = credential
    ? { credential }
    : devEmail
      ? { email: devEmail }
      : { email: "user@gmail.com" };
  const { res, data } = await postJson(`${getApiBaseUrl()}/api/auth/google`, body);
  if (!res.ok) {
    return { ok: false, message: detailMessage(data, res.status) };
  }
  const token = data.access_token;
  const em = data.email;
  if (typeof token !== "string" || typeof em !== "string") {
    return { ok: false, message: "Invalid response from server." };
  }
  setStoredAccessToken(token);
  return { ok: true, email: em };
}

export async function requestPasswordReset(
  email: string
): Promise<{ ok: boolean; message: string; resetLink?: string }> {
  const { res, data } = await postJson(`${getApiBaseUrl()}/api/auth/forgot-password`, { email });
  if (!res.ok) {
    return { ok: false, message: detailMessage(data, res.status) };
  }
  const message = typeof data.message === "string"
    ? data.message
    : "If an account exists for that email, a reset link has been sent.";
  const resetLink = typeof data.reset_link === "string" ? data.reset_link : undefined;
  return { ok: true, message, resetLink };
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<{ ok: boolean; message: string }> {
  const { res, data } = await postJson(`${getApiBaseUrl()}/api/auth/reset-password`, {
    token,
    new_password: newPassword,
  });
  if (!res.ok) {
    return { ok: false, message: detailMessage(data, res.status) };
  }
  const message = typeof data.message === "string"
    ? data.message
    : "Password updated successfully.";
  return { ok: true, message };
}
