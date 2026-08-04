import { admin, googleEnv, GOOGLE_TOKEN_URL } from "../_shared/google.ts";

function redirect(url: string) {
  return new Response(null, { status: 302, headers: { Location: url } });
}

Deno.serve(async (req) => {
  const { clientId, clientSecret, redirectUri, appUrl } = googleEnv();
  const incoming = new URL(req.url);
  const code = incoming.searchParams.get("code");
  const state = incoming.searchParams.get("state");
  const oauthError = incoming.searchParams.get("error");

  const base = appUrl || `${incoming.protocol}//${incoming.host}`;
  const fail = (reason: string, ret = "/configuracoes?tab=google-agenda") =>
    redirect(`${base}${ret}${ret.includes("?") ? "&" : "?"}google=error&reason=${encodeURIComponent(reason)}`);

  if (oauthError) return fail(oauthError);
  // CSRF protection: a code without a valid state is never accepted.
  if (!code || !state) return fail("missing_code_or_state");

  const db = admin();
  const { data: stateRow } = await db
    .from("google_oauth_states")
    .select("*")
    .eq("state", state)
    .maybeSingle();

  if (!stateRow) return fail("invalid_state");
  await db.from("google_oauth_states").delete().eq("state", state);
  if (new Date(stateRow.expires_at).getTime() < Date.now()) return fail("expired_state");

  const returnUrl: string = stateRow.return_url ?? "/configuracoes?tab=google-agenda";

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("google token exchange failed:", res.status, body);
    return fail("token_exchange_failed", returnUrl);
  }

  const tokens = await res.json();

  // Best-effort account email (not required for sync).
  let googleEmail: string | null = null;
  try {
    const info = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (info.ok) googleEmail = (await info.json()).email ?? null;
  } catch { /* ignore */ }

  const payload: Record<string, unknown> = {
    user_id: stateRow.user_id,
    organization_id: stateRow.organization_id,
    google_email: googleEmail,
    access_token: tokens.access_token,
    expiry_date: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
    is_active: true,
    last_error: null,
  };
  // Google only returns a refresh_token on the first consent — never overwrite with null.
  if (tokens.refresh_token) payload.refresh_token = tokens.refresh_token;

  const { error } = await db
    .from("google_oauth_connections")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    console.error("failed to store google connection:", error);
    return fail("storage_failed", returnUrl);
  }

  return redirect(`${base}${returnUrl}${returnUrl.includes("?") ? "&" : "?"}google=connected`);
});
