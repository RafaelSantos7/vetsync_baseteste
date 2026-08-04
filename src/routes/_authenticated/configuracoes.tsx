import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, User, Save, LogOut, Send, Users, Shield, UserPlus, Calendar as CalendarIcon, ExternalLink, CheckCircle2, AlertCircle, Pencil } from "lucide-react";
import { supabase, sb } from "@/integrations/supabase/client";
import { useRxQuery, useRxCollection, getCollection } from "@/hooks/use-rx";
import { uuid } from "@/hooks/use-rx";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { waLink, MESSAGE_TEMPLATES, openWa } from "@/lib/whatsapp";
import { getGoogleStatus, listGoogleCalendars, setGoogleCalendar, disconnectGoogle, startGoogleOAuth, syncPendingAppointments, type GoogleStatus } from "@/lib/google-calendar";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: ConfigPage,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any


function ConfigPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ full_name: string; crmv: string; phone: string }>({
    full_name: "", crmv: "", phone: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await sb.from("profiles").select("full_name,crmv,phone").eq("id", user.id).single();
      if (data) setProfile({ full_name: data.full_name ?? "", crmv: data.crmv ?? "", phone: data.phone ?? "" });
    })();
  }, [user]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await sb.from("profiles").update(profile).eq("id", user!.id);
      toast.success("Perfil atualizado");
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Perfil profissional e mensagens automáticas</p>
      </header>

      <Tabs defaultValue={new URLSearchParams(window.location.search).get("tab") || "perfil"}>
        <TabsList>
          <TabsTrigger value="perfil"><User className="mr-1.5 h-3.5 w-3.5" />Perfil</TabsTrigger>
          <TabsTrigger value="equipe"><Users className="mr-1.5 h-3.5 w-3.5" />Equipe</TabsTrigger>
          <TabsTrigger value="whatsapp"><MessageCircle className="mr-1.5 h-3.5 w-3.5" />WhatsApp</TabsTrigger>
          <TabsTrigger value="google-agenda"><CalendarIcon className="mr-1.5 h-3.5 w-3.5" />Google Agenda</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="mt-4">
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-card/60 p-5">
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Nome completo</Label>
                <Input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
              </div>
              <div><Label>CRMV</Label>
                <Input value={profile.crmv} onChange={(e) => setProfile({ ...profile, crmv: e.target.value })} placeholder="CRMV-XX 00000" />
              </div>
              <div><Label>Telefone</Label>
                <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
              </div>
              <div><Label>E-mail</Label>
                <Input value={user?.email ?? ""} disabled />
              </div>
            </div>
            <div className="mt-4 flex justify-between">
              <Button variant="outline" onClick={() => supabase.auth.signOut()}>
                <LogOut className="mr-1 h-4 w-4" />Sair
              </Button>
              <Button disabled={saving} className="bg-gradient-primary" onClick={saveProfile}>
                <Save className="mr-1 h-4 w-4" />Salvar perfil
              </Button>
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="equipe" className="mt-4">
          <TeamSettings />
        </TabsContent>

        <TabsContent value="whatsapp" className="mt-4">
          <WhatsAppSettings />
        </TabsContent>

        <TabsContent value="google-agenda" className="mt-4">
          <GoogleCalendarSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type TeamMember = {
  user_id: string;
  org_role: string;
  app_role: string;
  full_name: string;
  email: string;
  phone: string;
  crmv: string;
};

const ORG_ROLE_LABELS: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Colaborador",
  viewer: "Somente leitura",
};

const APP_ROLE_LABELS: Record<string, string> = {
  admin: "Admin (acesso total)",
  veterinarian: "Veterinário (atendimentos)",
  reception: "Recepção (agenda e cadastros)",
};

const emptyForm = {
  full_name: "",
  email: "",
  password: "",
  phone: "",
  crmv: "",
  org_role: "member",
  app_role: "veterinarian",
};


function TeamSettings() {
  const { user, organizationId } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgName, setOrgName] = useState("");
  const [editingOrg, setEditingOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);

  const myRole = members.find((m) => m.user_id === user?.id)?.org_role;
  const canManage = myRole === "owner" || myRole === "admin";

  const load = async () => {
    if (!organizationId) { setLoading(false); return; }
    setLoading(true);
    const [{ data: org }, { data: mem }] = await Promise.all([
      sb.from("organizations").select("name").eq("id", organizationId).maybeSingle(),
      sb.from("organization_members").select("user_id, role").eq("organization_id", organizationId),
    ]);
    if (org?.name) {
      setOrgName(org.name);
      setNewOrgName(org.name);
    }
    const ids = (mem ?? []).map((m: any) => m.user_id);
    let profiles: any[] = [];
    let roles: any[] = [];
    if (ids.length) {
      const [p, r] = await Promise.all([
        sb.from("profiles").select("id, full_name, email, phone, crmv").in("id", ids),
        sb.from("user_roles").select("user_id, role").in("user_id", ids),
      ]);
      profiles = p.data ?? [];
      roles = r.data ?? [];
    }
    setMembers(
      (mem ?? []).map((m: any) => {
        const p = profiles.find((x) => x.id === m.user_id);
        return {
          user_id: m.user_id,
          org_role: m.role,
          app_role: roles.find((x) => x.user_id === m.user_id)?.role ?? "veterinarian",
          full_name: p?.full_name ?? "Colaborador",
          email: p?.email ?? "",
          phone: p?.phone ?? "",
          crmv: p?.crmv ?? "",
        };
      }),
    );
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [organizationId]);

  const callAdmin = async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("admin-team", {
      body: { organization_id: organizationId, ...payload },
    });
    if (error) {
      // Try to surface the function's error message
      const msg = (data as any)?.error || error.message;
      throw new Error(msg);
    }
    if ((data as any)?.error) throw new Error((data as any).error);
    return data;
  };

  const createUser = async () => {
    setBusy(true);
    try {
      await callAdmin({ action: "create", ...form });
      toast.success(`Usuário ${form.full_name} cadastrado com acesso ao sistema`);
      setForm(emptyForm);
      await load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const saveMember = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      await callAdmin({
        action: "update",
        user_id: editing.user_id,
        full_name: editing.full_name,
        phone: editing.phone,
        crmv: editing.crmv,
        org_role: editing.org_role,
        app_role: editing.app_role,
        password: (editing as any).password || undefined,
      });
      toast.success("Permissões atualizadas");
      setEditing(null);
      await load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const removeMember = async (m: TeamMember) => {
    if (!confirm(`Remover ${m.full_name} da organização?`)) return;
    setBusy(true);
    try {
      await callAdmin({ action: "remove", user_id: m.user_id });
      toast.success("Colaborador removido");
      await load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="p-10 text-center text-sm text-muted-foreground">Carregando equipe...</div>;

  if (!organizationId)
    return (
      <div className="rounded-xl border border-border bg-card/60 p-5 text-sm text-muted-foreground">
        Nenhuma organização ativa encontrada para o seu usuário.
      </div>
    );

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card/60 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-medium">Sua Organização</h3>
            {editingOrg ? (
              <div className="mt-2 flex items-center gap-2">
                <Input 
                  value={newOrgName} 
                  onChange={(e) => setNewOrgName(e.target.value)} 
                  className="max-w-[240px]"
                />
                <Button size="sm" onClick={async () => {
                  try {
                    await sb.from("organizations").update({ name: newOrgName }).eq("id", organizationId);
                    setOrgName(newOrgName);
                    setEditingOrg(false);
                    toast.success("Nome da organização atualizado");
                  } catch (e) { toast.error("Erro ao atualizar"); }
                }}>Salvar</Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  setEditingOrg(false);
                  setNewOrgName(orgName);
                }}>Cancelar</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">{orgName || "Carregando..."}</p>
                {canManage && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingOrg(true)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary">
            {ORG_ROLE_LABELS[myRole ?? "member"]}
          </Badge>
        </div>

        {canManage ? (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" /> Cadastrar novo usuário
            </h4>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Nome completo *</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div>
                <Label>E-mail de login *</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label>Senha inicial * (mín. 6)</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label>CRMV</Label>
                <Input value={form.crmv} onChange={(e) => setForm({ ...form, crmv: e.target.value })} placeholder="CRMV-XX 00000" />
              </div>
              <div>
                <Label>Permissão no sistema</Label>
                <select
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.app_role}
                  onChange={(e) => setForm({ ...form, app_role: e.target.value })}
                >
                  {Object.entries(APP_ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <Label>Cargo na organização</Label>
                <select
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.org_role}
                  onChange={(e) => setForm({ ...form, org_role: e.target.value })}
                >
                  {["admin", "member", "viewer"].map((v) => <option key={v} value={v}>{ORG_ROLE_LABELS[v]}</option>)}
                </select>
              </div>
            </div>
            <Button
              className="bg-gradient-primary"
              disabled={busy || !form.full_name || !form.email || form.password.length < 6}
              onClick={createUser}
            >
              <UserPlus className="mr-1 h-4 w-4" /> Cadastrar usuário
            </Button>
            <p className="text-[10px] text-muted-foreground italic">
              O usuário poderá entrar imediatamente com o e-mail e a senha definidos acima. Somente o administrador define as permissões.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> Somente administradores podem cadastrar usuários e definir permissões.
          </p>
        )}
      </motion.div>

      <div className="grid gap-3">
        <h3 className="text-sm font-medium flex items-center gap-2 px-1">
          <Shield className="h-4 w-4 text-primary" /> Membros da Equipe ({members.length})
        </h3>
        {members.map((member) => (
          <motion.div
            key={member.user_id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-xl border border-border bg-card/40 p-3"
          >
            {editing?.user_id === member.user_id ? (
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label>Nome</Label>
                    <Input value={editing.full_name} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
                  </div>
                  <div>
                    <Label>CRMV</Label>
                    <Input value={editing.crmv} onChange={(e) => setEditing({ ...editing, crmv: e.target.value })} />
                  </div>
                  <div>
                    <Label>Nova senha (opcional)</Label>
                    <Input type="password" onChange={(e) => setEditing({ ...editing, ...{ password: e.target.value } } as any)} />
                  </div>
                  <div>
                    <Label>Permissão no sistema</Label>
                    <select
                      className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={editing.app_role}
                      onChange={(e) => setEditing({ ...editing, app_role: e.target.value })}
                    >
                      {Object.entries(APP_ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Cargo na organização</Label>
                    <select
                      className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={editing.org_role}
                      disabled={member.org_role === "owner"}
                      onChange={(e) => setEditing({ ...editing, org_role: e.target.value })}
                    >
                      {["owner", "admin", "member", "viewer"].map((v) => <option key={v} value={v}>{ORG_ROLE_LABELS[v]}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" disabled={busy} onClick={saveMember}>
                    <Save className="mr-1 h-4 w-4" /> Salvar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                    {(member.full_name || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {member.full_name}
                      {member.user_id === user?.id && (
                        <span className="ml-2 text-[10px] bg-muted px-1.5 py-0.5 rounded uppercase tracking-wider">Você</span>
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{member.email}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {ORG_ROLE_LABELS[member.org_role]} · {APP_ROLE_LABELS[member.app_role]}
                    </p>
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => setEditing(member)}>Editar</Button>
                    {member.user_id !== user?.id && member.org_role !== "owner" && (
                      <Button
                        variant="ghost" size="sm" disabled={busy}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeMember(member)}
                      >
                        Remover
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function WhatsAppSettings() {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(MESSAGE_TEMPLATES.lembreteConsulta("Cliente", "amanhã 10h"));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-border bg-card/60 p-5">
        <div className="mb-3 flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-emerald-500" />
          <h3 className="font-medium">Teste de envio (wa.me)</h3>
          <Badge variant="outline" className="ml-auto text-[10px]">click-to-chat</Badge>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Abre o WhatsApp do dispositivo com mensagem pré-preenchida. Não requer API.
        </p>
        <div className="space-y-3">
          <div><Label>Telefone (com DDD)</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
          </div>
          <div><Label>Mensagem</Label>
            <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <Button
            disabled={!phone}
            onClick={() => openWa(phone, message)}
            className="w-full bg-emerald-500 text-white hover:bg-emerald-600">
            <Send className="mr-2 h-4 w-4" />Abrir conversa
          </Button>
          {phone && (
            <p className="text-[11px] text-muted-foreground break-all">
              Link: <a className="text-primary underline" target="_blank" rel="noreferrer" href={waLink(phone, message)}>{waLink(phone, message)}</a>
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/60 p-5">
        <h3 className="mb-3 font-medium">Modelos de mensagem</h3>
        <ul className="space-y-2 text-sm">
          {Object.entries({
            "Lembrete de consulta": MESSAGE_TEMPLATES.lembreteConsulta("João", "23/05 às 10h"),
            "Vacina vencida": MESSAGE_TEMPLATES.vacinaVencida("Maria", "Rex", "V8"),
            "Retorno após visita": MESSAGE_TEMPLATES.retornoVisita("Carlos"),
            "Cobrança": MESSAGE_TEMPLATES.cobranca("Ana", "350,00", "30/05"),
          }).map(([k, v]) => (
            <li key={k} className="rounded-lg border border-border bg-background/40 p-3">
              <div className="mb-1 text-xs font-medium text-muted-foreground">{k}</div>
              <div className="text-sm">{v}</div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Para envio automatizado e recebimento de mensagens (API oficial), uma integração com WhatsApp Business pode ser adicionada futuramente.
        </p>
      </div>
    </div>
  );
}

function GoogleCalendarSettings() {
  const { organizationId } = useAuth();
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [calendars, setCalendars] = useState<{ id: string; summary: string; primary: boolean }[]>([]);

  const refresh = async () => {
    try {
      const s = await getGoogleStatus();
      setStatus(s);
      if (s.connected) {
        try { setCalendars((await listGoogleCalendars()).calendars); } catch { /* opcional */ }
      }
    } catch (e) {
      toast.error("Não foi possível verificar a conexão: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  // Resultado do callback OAuth (processado no backend).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("google");
    if (!result) return;
    if (result === "connected") {
      toast.success("Google Agenda conectado!");
      refresh();
      syncPendingAppointments();
    } else {
      toast.error("Falha ao conectar: " + (params.get("reason") || "erro desconhecido"));
    }
    window.history.replaceState({}, document.title, "/configuracoes?tab=google-agenda");
  }, []);

  const connect = async () => {
    setBusy(true);
    try {
      await startGoogleOAuth(organizationId);
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await disconnectGoogle();
      setCalendars([]);
      toast.success("Google Agenda desconectado");
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const changeCalendar = async (id: string) => {
    try {
      const s = await setGoogleCalendar(id);
      setStatus(s);
      toast.success("Calendário atualizado");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const connected = !!status?.connected;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card/60 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-medium flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" /> Integração Google Agenda
            </h3>
            <p className="text-sm text-muted-foreground">Seus agendamentos são enviados para o Google Agenda.</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${connected ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
            {loading ? "Verificando…" : connected ? "Conectado" : "Desconectado"}
          </span>
        </div>

        <div className="grid gap-4">
          {connected && (
            <div className="grid gap-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-muted-foreground">Conta conectada:</span>
                <span className="font-medium break-all">{status?.google_email || "conta Google"}</span>
              </div>
              <div className="grid gap-1.5">
                <Label>Calendário</Label>
                {calendars.length > 0 ? (
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={status?.calendar_id || "primary"}
                    onChange={(e) => changeCalendar(e.target.value)}
                  >
                    {calendars.map((c) => (
                      <option key={c.id} value={c.id}>{c.summary}{c.primary ? " (principal)" : ""}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-muted-foreground">{status?.calendar_id || "primary"}</p>
                )}
              </div>
              {status?.last_synced_at && (
                <p className="text-xs text-muted-foreground">
                  Última atividade: {new Date(status.last_synced_at).toLocaleString("pt-BR")}
                </p>
              )}
              {status?.last_error && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs">
                  <p className="font-medium text-destructive">Erro na última sincronização</p>
                  <p className="mt-1 break-all text-muted-foreground">{status.last_error}</p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => syncPendingAppointments().then(refresh)}>
                    Tentar novamente
                  </Button>
                </div>
              )}
            </div>
          )}

          {!connected && !loading && (
            <div className="rounded-lg bg-muted/40 p-4 text-xs text-muted-foreground">
              As credenciais do Google ficam somente no servidor (Secrets <code className="rounded bg-muted px-1">GOOGLE_CLIENT_ID</code>,{" "}
              <code className="rounded bg-muted px-1">GOOGLE_CLIENT_SECRET</code>, <code className="rounded bg-muted px-1">GOOGLE_REDIRECT_URI</code>).
              Nenhum token é armazenado no navegador.
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {connected ? (
              <Button variant="outline" disabled={busy} onClick={disconnect}>Desconectar</Button>
            ) : (
              <Button disabled={busy || loading} onClick={connect}>
                <ExternalLink className="mr-2 h-4 w-4" /> Conectar Google Agenda
              </Button>
            )}
            <Button variant="ghost" disabled={busy} onClick={refresh}>Atualizar status</Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
