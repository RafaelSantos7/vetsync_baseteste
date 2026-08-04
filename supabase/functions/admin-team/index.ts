import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const APP_ROLES = ["admin", "veterinario", "recepcao"];
const ORG_ROLES = ["owner", "admin", "member", "viewer"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    // Identify the caller with their own token (never used for privileged writes)
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Não autenticado" }, 401);
    const callerId = userData.user.id;

    const admin = createClient(url, serviceKey);
    const body = await req.json();
    const action: string = body.action;
    const organizationId: string = body.organization_id;

    if (!organizationId) return json({ error: "Organização não informada" }, 400);

    // Caller must be owner/admin of the organization
    const { data: callerMember } = await admin
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", callerId)
      .maybeSingle();

    if (!callerMember || !["owner", "admin"].includes(callerMember.role))
      return json({ error: "Apenas administradores da organização podem gerenciar usuários" }, 403);

    if (action === "create") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      const fullName = String(body.full_name ?? "").trim();
      const orgRole = ORG_ROLES.includes(body.org_role) ? body.org_role : "member";
      const appRole = APP_ROLES.includes(body.app_role) ? body.app_role : "veterinario";

      if (!email || !password || password.length < 6 || !fullName)
        return json({ error: "Nome, e-mail e senha (mín. 6 caracteres) são obrigatórios" }, 400);

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          phone: body.phone ?? null,
          crmv: body.crmv ?? null,
          app_role: appRole,
        },
      });

      let newUserId = created?.user?.id;

      if (createErr) {
        // Log details for debugging
        console.error("Auth creation error details:", createErr);
        
        // Try to check if user already exists in auth.users by listing (privileged)
        const { data: existingUsers } = await admin.auth.admin.listUsers();
        const found = existingUsers?.users?.find(u => u.email?.toLowerCase() === email);
        
        if (found) {
          newUserId = found.id;
        } else {
          return json({ error: `Erro ao criar acesso: ${createErr.message}` }, 400);
        }
      }

      // Sync Profile
      await admin.from("profiles").upsert({
        id: newUserId,
        full_name: fullName,
        email,
        phone: body.phone ?? null,
        crmv: body.crmv ?? null,
        updated_at: new Date().toISOString(),
      });

      // Sync System Roles
      await admin.from("user_roles").delete().eq("user_id", newUserId);
      await admin.from("user_roles").insert({ user_id: newUserId, role: appRole });

      // Link to Organization
      await admin
        .from("organization_members")
        .upsert(
          {
            organization_id: organizationId,
            user_id: newUserId,
            role: orgRole,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "organization_id,user_id" },
        );

      return json({ ok: true, user_id: newUserId });
    }

    if (action === "update") {
      const targetId: string = body.user_id;
      if (!targetId) return json({ error: "Usuário não informado" }, 400);

      if (ORG_ROLES.includes(body.org_role)) {
        await admin
          .from("organization_members")
          .update({ role: body.org_role, updated_at: new Date().toISOString() })
          .eq("organization_id", organizationId)
          .eq("user_id", targetId);
      }
      if (APP_ROLES.includes(body.app_role)) {
        await admin.from("user_roles").delete().eq("user_id", targetId);
        await admin.from("user_roles").insert({ user_id: targetId, role: body.app_role });
      }
      if (body.password) {
        if (String(body.password).length < 6)
          return json({ error: "A senha deve ter no mínimo 6 caracteres" }, 400);
        await admin.auth.admin.updateUserById(targetId, { password: String(body.password) });
      }
      if (body.full_name || body.phone !== undefined || body.crmv !== undefined) {
        await admin
          .from("profiles")
          .update({
            ...(body.full_name ? { full_name: body.full_name } : {}),
            ...(body.phone !== undefined ? { phone: body.phone } : {}),
            ...(body.crmv !== undefined ? { crmv: body.crmv } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("id", targetId);
      }
      return json({ ok: true });
    }

    if (action === "remove") {
      const targetId: string = body.user_id;
      if (!targetId) return json({ error: "Usuário não informado" }, 400);
      if (targetId === callerId) return json({ error: "Você não pode remover a si mesmo" }, 400);
      await admin
        .from("organization_members")
        .delete()
        .eq("organization_id", organizationId)
        .eq("user_id", targetId);
      return json({ ok: true });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});