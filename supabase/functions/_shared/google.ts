import { createClient } from "npm:@supabase/supabase-js@2";

export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const CALENDAR_API = "https://www.googleapis.com/calendar/v3";
export const GOOGLE_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

export function googleEnv() {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const redirectUri = Deno.env.get("GOOGLE_REDIRECT_URI");
  const appUrl = Deno.env.get("APP_URL") ?? "";
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Google não configurado. Defina GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REDIRECT_URI nas Secrets.",
    );
  }
  return { clientId, clientSecret, redirectUri, appUrl };
}

/** Validates the caller's JWT and returns the user id. Throws on failure. */
export async function requireUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Response("Unauthorized", { status: 401 });
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await sb.auth.getClaims(token);
  if (error || !data?.claims?.sub) throw new Response("Unauthorized", { status: 401 });
  return { userId: data.claims.sub as string, sb };
}

/** Returns a valid access token for the user, refreshing it when needed. */
export async function getAccessToken(userId: string) {
  const db = admin();
  const { data: conn } = await db
    .from("google_oauth_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!conn || !conn.refresh_token || !conn.is_active) return null;

  const expired = !conn.expiry_date || new Date(conn.expiry_date).getTime() <= Date.now() + 60_000;
  if (!expired && conn.access_token) return { token: conn.access_token as string, conn };

  const { clientId, clientSecret } = googleEnv();
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: conn.refresh_token,
      grant_type: "refresh_token",
    }).toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    await db.from("google_oauth_connections")
      .update({ last_error: `refresh_failed: ${body}`.slice(0, 500) })
      .eq("user_id", userId);
    return null;
  }

  const tokens = await res.json();
  const expiry = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString();
  await db.from("google_oauth_connections")
    .update({ access_token: tokens.access_token, expiry_date: expiry, last_error: null })
    .eq("user_id", userId);

  return { token: tokens.access_token as string, conn: { ...conn, access_token: tokens.access_token } };
}
