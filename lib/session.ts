const SESSION_KEY = "tool_session_id";

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";

  try {
    const existing = window.localStorage.getItem(SESSION_KEY);
    if (existing && existing.trim().length > 0) return existing;

    const nextId = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    window.localStorage.setItem(SESSION_KEY, nextId);
    return nextId;
  } catch {
    return "";
  }
}
