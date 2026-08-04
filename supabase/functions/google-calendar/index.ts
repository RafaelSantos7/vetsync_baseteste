import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { admin, requireUser, getAccessToken, CALENDAR_API } from "../_shared/google.ts";

type Body = {
  action: "status" | "disconnect" | "calendars" | "sync_appointment" | "delete_event" | "set_calendar";
  appointment?: {
    id: string;
    title: string;
    notes?: string | null;
    scheduled_at: string;
    duration_min?: number | null;
    category?: string | null;
    client_name?: string | null;
    client_phone?: string | null;
    pet_name?: string | null;
    location?: string | null;
    google_event_id?: string | null;
    status?: string | null;
  };
  google_event_id?: string;
  calendar_id?: string;
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { userId } = await requireUser(req);
    const db = admin();
    const body = (await req.json().catch(() => ({}))) as Body;

    const { data: conn } = await db
      .from("google_oauth_connections")
      .select("google_email, calendar_id, is_active, refresh_token, last_error, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    const status = {
      connected: !!conn?.refresh_token && !!conn?.is_active,
      google_email: conn?.google_email ?? null,
      calendar_id: conn?.calendar_id ?? "primary",
      last_error: conn?.last_error ?? null,
      last_synced_at: conn?.updated_at ?? null,
    };

    if (body.action === "status") return json(status);

    if (body.action === "disconnect") {
      await db.from("google_oauth_connections").delete().eq("user_id", userId);
      return json({ connected: false });
    }

    if (body.action === "set_calendar") {
      await db.from("google_oauth_connections")
        .update({ calendar_id: body.calendar_id || "primary" })
        .eq("user_id", userId);
      return json({ ...status, calendar_id: body.calendar_id || "primary" });
    }

    const auth = await getAccessToken(userId);
    if (!auth) return json({ error: "disconnected", ...status, connected: false }, 409);

    const calendarId = body.calendar_id || auth.conn.calendar_id || "primary";

    if (body.action === "calendars") {
      const res = await fetch(`${CALENDAR_API}/users/me/calendarList`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      const text = await res.text();
      if (!res.ok) return json({ error: "google_error", status: res.status, details: text }, res.status);
      const list = JSON.parse(text);
      return json({
        calendars: (list.items ?? []).map((c: any) => ({ id: c.id, summary: c.summary, primary: !!c.primary })),
      });
    }

    if (body.action === "delete_event") {
      if (!body.google_event_id) return json({ error: "google_event_id obrigatório" }, 400);
      const res = await fetch(
        `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(body.google_event_id)}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${auth.token}` } },
      );
      if (!res.ok && res.status !== 404 && res.status !== 410) {
        const details = await res.text();
        return json({ error: "google_error", status: res.status, details }, res.status);
      }
      return json({ deleted: true });
    }

    if (body.action === "sync_appointment") {
      const a = body.appointment;
      if (!a?.id || !a.scheduled_at) return json({ error: "appointment inválido" }, 400);

      const start = new Date(a.scheduled_at);
      const end = new Date(start.getTime() + (a.duration_min ?? 30) * 60_000);
      const descriptionLines = [
        a.client_name ? `Tutor: ${a.client_name}` : null,
        a.client_phone ? `Telefone: ${a.client_phone}` : null,
        a.pet_name ? `Animal: ${a.pet_name}` : null,
        a.category ? `Categoria: ${a.category}` : null,
        a.notes ? `Observações: ${a.notes}` : null,
      ].filter(Boolean);

      const event = {
        summary: a.title,
        description: descriptionLines.join("\n"),
        location: a.location ?? undefined,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        status: a.status === "cancelado" ? "cancelled" : "confirmed",
        // Idempotency: the same appointment always maps to the same Google event.
        extendedProperties: { private: { vetsystem_appointment_id: a.id } },
      };

      const existing = a.google_event_id;
      const url = existing
        ? `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(existing)}`
        : `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`;

      let res = await fetch(url, {
        method: existing ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${auth.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });

      // Event was removed on Google's side: recreate instead of failing.
      if (existing && (res.status === 404 || res.status === 410)) {
        res = await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`, {
          method: "POST",
          headers: { Authorization: `Bearer ${auth.token}`, "Content-Type": "application/json" },
          body: JSON.stringify(event),
        });
      }

      const text = await res.text();
      if (!res.ok) {
        console.error(`Google Calendar sync failed [${res.status}]: ${text}`);
        await db.from("google_oauth_connections")
          .update({ last_error: `sync_failed: ${text}`.slice(0, 500) })
          .eq("user_id", userId);
        return json({ error: "google_error", status: res.status, details: text }, res.status);
      }

      const data = JSON.parse(text);
      await db.from("google_oauth_connections").update({ last_error: null }).eq("user_id", userId);
      return json({
        google_event_id: data.id,
        google_calendar_id: calendarId,
        google_synced_at: new Date().toISOString(),
      });
    }

    return json({ error: "ação desconhecida" }, 400);
  } catch (e) {
    if (e instanceof Response) return new Response(await e.text(), { status: e.status, headers: corsHeaders });
    console.error("google-calendar error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
