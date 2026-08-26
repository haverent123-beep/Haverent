
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://have-rent.onrender.com";

export async function api(path, options = {}) {
  const token = localStorage.getItem("haverent_token");
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}
export { API_BASE_URL };
