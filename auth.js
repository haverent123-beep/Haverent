const DEFAULT_APIS = [
  import.meta.env.VITE_API_URL,
  "https://haverent.onrender.com",
].filter(Boolean).map((url) => url.replace(/\/$/, ""));

const API_BASE = DEFAULT_APIS[0] || "https://haverent.onrender.com";

export function saveAuth(data, fallbackUser = {}) {
  const token = data?.token || data?.accessToken || data?.jwt;
  const serverUser = data?.user || data?.data?.user || {};
  const user = { ...fallbackUser, ...serverUser };
  if (token) localStorage.setItem("haverent_token", token);
  if (user && Object.keys(user).length) {
    localStorage.setItem("haverent_user", JSON.stringify(user));
  }
  return { token, user };
}

export function getToken() { return localStorage.getItem("haverent_token"); }

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem("haverent_user") || "null");
  } catch {
    return null;
  }
}

export function dashboardPath(user) {
  const role = String(user?.role || user?.userType || "customer").toLowerCase();
  return role === "owner" || role === "landlord"
    ? "/owner/dashboard"
    : "/customer/dashboard";
}

async function requestFromBase(base, path, body) {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  let data = {};
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    const message =
      data?.message ||
      data?.error ||
      `Request failed (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }

  return data;
}

export async function authRequest(path, body) {
  let lastError = null;

  for (const base of DEFAULT_APIS) {
    try {
      // The deployed HavenRent backend uses /api/auth/*.
      // Keep the legacy path as a compatibility fallback.
      try {
        return await requestFromBase(base, path, body);
      } catch (err) {
        lastError = err;

        if (err.status !== 404) throw err;

        const legacy =
          path === "/api/auth/register"
            ? "/api/register"
            : path === "/api/auth/login"
              ? "/api/login"
              : null;

        if (legacy) {
          try {
            return await requestFromBase(base, legacy, body);
          } catch (legacyErr) {
            lastError = legacyErr;
            if (legacyErr.status !== 404) throw legacyErr;
          }
        }
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Unable to reach HavenRent server.");
}

export { API_BASE };
