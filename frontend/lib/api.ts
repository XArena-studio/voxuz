const API_BASE = "/api/v1";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("voxuz_token");
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Xato yuz berdi");
  return data;
}

export const api = {
  // Auth
  register: (email: string, password: string) =>
    request("/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }),

  login: (email: string, password: string) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  // Voices
  myVoices: () => request("/voices/"),
  publicVoices: (search?: string) =>
    request(`/voices/public${search ? `?search=${search}` : ""}`),
  deleteVoice: (id: string) => request(`/voices/${id}`, { method: "DELETE" }),

  // Verification
  getVerificationText: () => request("/verification/text"),

  // Generation
  generate: (text: string, voice_id: string) =>
    request("/generation/", { method: "POST", body: JSON.stringify({ text, voice_id }) }),
  getGeneration: (id: string) => request(`/generation/${id}`),
  myGenerations: () => request("/generation/history/me"),
};
