import { supabase } from "./supabase";
import { getOrCreateSessionId } from "./session";

export type ToolEventType = "view_tool" | "click_try" | "generate" | "visit_tool";

export async function trackToolEvent({
  toolId,
  eventType,
  metadata,
}: {
  toolId: string;
  eventType: ToolEventType;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (!toolId) return;

  try {
    const sessionId = getOrCreateSessionId();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("tool_events").insert({
      tool_id: toolId,
      event_type: eventType,
      session_id: sessionId || null,
      user_id: user?.id ?? null,
      metadata: metadata ?? {},
    });
  } catch {
    // Tracking should never break user-facing UI.
  }
}
