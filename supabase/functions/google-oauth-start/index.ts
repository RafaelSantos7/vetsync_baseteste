import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { admin, googleEnv, requireUser, GOOGLE_AUTH_URL, GOOGLE_SCOPE } from "../_shared/google.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { userId } = await requireUser(req);
    const { clientId, redirectUri } = googleEnv();

    const body = await req.json().catch(() => ({}));
    const organizationId: string | null = body?.organization_id ?? null;
    const returnUrl: string = typeof body?.return_url === "string" ? body.return_url : "/configuracoes?tab=google-agenda";

    const state = crypto.randomUUID();
    const nonce = crypto.randomUUID();

    const db = admin();
    await db.from("google_oauth_states").insert({
      state,
      user_id: userId,
      organization_id: organizationId,
      return_url: returnUrl.startsWith("/") ? returnUrl : "/configuracoes?tab=google-agenda",
      nonce,
    });

    const url = `${GOOGLE_AUTH_URL}?${new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GOOGLE_SCOPE,
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
    })}`;

    return new Response(JSON.stringify({ url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    if (e instanceof Response) return new Response(await e.text(), { status: e.status, headers: corsHeaders });
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
