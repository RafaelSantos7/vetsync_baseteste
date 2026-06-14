import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, User, Save, LogOut, Send } from "lucide-react";
import { supabase, sb } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { waLink, MESSAGE_TEMPLATES, openWa } from "@/lib/whatsapp";

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

      <Tabs defaultValue="perfil">
        <TabsList>
          <TabsTrigger value="perfil"><User className="mr-1.5 h-3.5 w-3.5" />Perfil</TabsTrigger>
          <TabsTrigger value="whatsapp"><MessageCircle className="mr-1.5 h-3.5 w-3.5" />WhatsApp</TabsTrigger>
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

        <TabsContent value="whatsapp" className="mt-4">
          <WhatsAppSettings />
        </TabsContent>
      </Tabs>
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
