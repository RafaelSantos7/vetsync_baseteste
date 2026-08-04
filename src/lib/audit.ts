import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "login"
  | "record_link_created"
  | "record_whatsapp_opened"
  | "record_share_error"
  | "google_calendar_connected"
  | "google_calendar_disconnected"
  | "google_calendar_synced"
  | "google_calendar_sync_error"
  | "permissions_changed"
  | "collaborator_invited"
  | "collaborator_activated"
  | "collaborator_deactivated"
  | "collaborator_deleted";

/** Fire-and-forget audit trail. Never throws — auditing must not break a flow. */
export async function logAudit(
  action: AuditAction,
  module: string,
  recordId?: string | null,
  details: Record<string, unknown> = {},
) {
  try {
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) return;
    await supabase.from("audit_logs").insert({
      user_id: userId,
      action,
      module,
      record_id: recordId ?? null,
      details: details as never,
    });
  } catch {
    /* ignore */
  }
}
