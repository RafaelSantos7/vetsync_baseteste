import { getCollection } from "@/hooks/use-rx";
import { supabase } from "@/integrations/supabase/client";

/**
 * Google Calendar client helpers.
 *
 * SECURITY: no Client ID, Client Secret, access token or refresh token ever
 * touches the browser. Everything goes through the `google-calendar`,
 * `google-oauth-start` and `google-oauth-callback` edge functions, which read
 * the credentials from server-side Secrets and store the user tokens in a table
 * that has no SELECT access for regular users.
 */

export type GoogleStatus = {
  connected: boolean;
  google_email: string | null;
  calendar_id: string;
  last_error: string | null;
  last_synced_at: string | null;
};

export type GoogleSyncStatus = "pending" | "syncing" | "synced" | "error" | "disconnected";

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("google-calendar", { body });
  if (error) {
    const details = (error as any)?.context?.text ? await (error as any).context.text() : error.message;
    throw new Error(details || error.message);
  }
  return data as T;
}

export function getGoogleStatus() {
  return call<GoogleStatus>({ action: "status" });
}

export function listGoogleCalendars() {
  return call<{ calendars: { id: string; summary: string; primary: boolean }[] }>({ action: "calendars" });
}

export function setGoogleCalendar(calendar_id: string) {
  return call<GoogleStatus>({ action: "set_calendar", calendar_id });
}

export function disconnectGoogle() {
  return call<{ connected: boolean }>({ action: "disconnect" });
}

/** Starts the OAuth flow. The state/nonce pair is created server-side (CSRF safe). */
export async function startGoogleOAuth(organizationId: string | null) {
  const { data, error } = await supabase.functions.invoke("google-oauth-start", {
    body: { organization_id: organizationId, return_url: "/configuracoes?tab=google-agenda" },
  });
  if (error) throw new Error(error.message);
  const url = (data as any)?.url;
  if (!url) throw new Error("Não foi possível iniciar a autorização do Google.");
  window.location.href = url;
}

async function patchAppointment(id: string, patch: Record<string, unknown>) {
  const col = await getCollection("appointments");
  const doc = await col.findOne(id).exec();
  if (doc) await doc.patch({ ...patch, updated_at: new Date().toISOString() });
}

/**
 * Pushes an appointment to Google Calendar. Never throws and never blocks the
 * local save: offline or failed syncs only mark the local sync status.
 */
export async function syncAppointmentToGoogle(appointmentId: string, _orgId?: string | null) {
  try {
    const apptCol = await getCollection("appointments");
    const apptDoc = await apptCol.findOne(appointmentId).exec();
    if (!apptDoc) return;
    const appt = apptDoc.toJSON() as any;
    if (appt.is_deleted) return;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await patchAppointment(appointmentId, { google_sync_status: "pending" });
      return;
    }

    await patchAppointment(appointmentId, { google_sync_status: "syncing" });

    // Enrich the event with tutor / animal data from the local database.
    let clientName: string | null = null;
    let clientPhone: string | null = null;
    let petName: string | null = null;
    try {
      if (appt.client_id) {
        const c = await (await getCollection("clients")).findOne(appt.client_id).exec();
        clientName = c?.get("name") ?? null;
        clientPhone = c?.get("phone") ?? c?.get("whatsapp") ?? null;
      }
      if (appt.pet_id) {
        const p = await (await getCollection("pets")).findOne(appt.pet_id).exec();
        petName = p?.get("name") ?? null;
      }
    } catch { /* enrichment is optional */ }

    const res = await call<{ google_event_id: string; google_calendar_id: string; google_synced_at: string }>({
      action: "sync_appointment",
      appointment: {
        id: appt.id,
        title: appt.title,
        notes: appt.notes,
        scheduled_at: appt.scheduled_at,
        duration_min: appt.duration_min,
        category: appt.category,
        status: appt.status,
        google_event_id: appt.google_event_id ?? null,
        client_name: clientName,
        client_phone: clientPhone,
        pet_name: petName,
      },
    });

    await patchAppointment(appointmentId, {
      google_event_id: res.google_event_id,
      google_calendar_id: res.google_calendar_id,
      google_sync_status: "synced",
      google_synced_at: res.google_synced_at,
      google_sync_error: null,
      last_synced_at: res.google_synced_at,
    });
  } catch (e) {
    const message = (e as Error).message ?? "erro desconhecido";
    const disconnected = message.includes("disconnected");
    await patchAppointment(appointmentId, {
      google_sync_status: disconnected ? "disconnected" : "error",
      google_sync_error: message.slice(0, 300),
    }).catch(() => {});
    console.warn("[google-calendar] sync falhou:", message);
  }
}

/** Manual retry for a single appointment. */
export function retryAppointmentSync(appointmentId: string) {
  return syncAppointmentToGoogle(appointmentId);
}

export async function deleteGoogleEvent(googleEventId: string, _orgId?: string | null) {
  try {
    if (!googleEventId) return;
    await call({ action: "delete_event", google_event_id: googleEventId });
  } catch (e) {
    console.warn("[google-calendar] falha ao excluir evento:", (e as Error).message);
  }
}

/** Re-sends every appointment left in `pending` / `error` (called when back online). */
export async function syncPendingAppointments() {
  try {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    const col = await getCollection("appointments");
    const docs = await col
      .find({ selector: { is_deleted: { $ne: true }, google_sync_status: { $in: ["pending", "error"] } } })
      .exec();
    for (const d of docs) await syncAppointmentToGoogle(d.get("id"));
  } catch (e) {
    console.warn("[google-calendar] fila de sincronização:", (e as Error).message);
  }
}
