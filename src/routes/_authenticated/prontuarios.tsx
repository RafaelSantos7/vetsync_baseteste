import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Plus, Search, Stethoscope, FileDown, Pencil, Trash2, FileSignature, Calendar,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { FileDrop, type AttachedFile } from "@/components/file-drop";
import { SignaturePad } from "@/components/signature-pad";
import { pdfPrescription, pdfAttestation } from "@/lib/pdf";
import { WhatsAppShareDialog } from "@/components/whatsapp-share-dialog";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { useRxQuery, useRxCollection, uuid } from "@/hooks/use-rx";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/prontuarios")({
  component: ProntuariosPage,
});

type MedRecord = {
  id: string;
  pet_id: string;
  client_id: string | null;
  appointment_date: string;
  weight: number | null;
  temperature: number | null;
  anamnesis: string | null;
  symptoms: string | null;
  diagnosis: string | null;
  prescription: string | null;
  observations: string | null;
  signature_url: string | null;
  attachments: AttachedFile[];
};

type Pet = { id: string; name: string; client_id: string; species: string | null; breed: string | null; sex: string | null; weight: number | null };
type Client = { id: string; name: string; document: string | null; phone: string | null; whatsapp?: string | null };
type Profile = { full_name: string | null; crmv: string | null };

function ProntuariosPage() {
  const { organizationId, loading: authLoading } = useAuth();
  const recordsCol = useRxCollection("medical_records");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MedRecord | null>(null);
  const [sharing, setSharing] = useState<MedRecord | null>(null);

  const { data: pets = [] } = useRxQuery<Pet>("pets", { 
    selector: { 
      is_deleted: { $ne: true },
      organization_id: { $eq: organizationId }
    } 
  });
  const { data: clients = [] } = useRxQuery<Client>("clients", { 
    selector: { 
      is_deleted: { $ne: true },
      organization_id: { $eq: organizationId }
    } 
  });
  const { data: rawRecords = [], isLoading: rxLoading } = useRxQuery<MedRecord>("medical_records", {
    selector: { 
      is_deleted: { $ne: true },
      organization_id: { $eq: organizationId }
    },
  });
  const isLoading = authLoading || rxLoading;
  const records = [...rawRecords].sort((a, b) => (b.appointment_date ?? "").localeCompare(a.appointment_date ?? ""));

  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name,crmv").maybeSingle();
      return data as Profile | null;
    },
  });

  const petById = useMemo(() => new Map(pets.map((p) => [p.id, p])), [pets]);
  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  const filtered = records.filter((r) => {
    const p = petById.get(r.pet_id);
    const c = p ? clientById.get(p.client_id) : null;
    const q = search.toLowerCase();
    return !q || p?.name.toLowerCase().includes(q) || c?.name.toLowerCase().includes(q) ||
      r.diagnosis?.toLowerCase().includes(q);
  });

  const remove = async (id: string) => {
    if (!confirm("Excluir este prontuário?") || !recordsCol) return;
    const doc = await recordsCol.findOne(id).exec();
    if (doc) await doc.remove();
    toast.success("Prontuário excluído");
  };

  const vetInfo = { vetName: profile?.full_name ?? undefined, crmv: profile?.crmv ?? undefined, clinicName: "VetSystem" };

  const printRx = (r: MedRecord) => {
    const pet = petById.get(r.pet_id);
    if (!pet) return;
    const client = clientById.get(pet.client_id) ?? null;
    pdfPrescription({
      vet: vetInfo, pet, client,
      prescription: r.prescription ?? "",
      signatureUrl: r.signature_url ?? undefined,
    });
  };
  const printAt = (r: MedRecord) => {
    const pet = petById.get(r.pet_id);
    if (!pet) return;
    const client = clientById.get(pet.client_id) ?? null;
    pdfAttestation({
      vet: vetInfo, pet, client,
      text: `Atesto, para os devidos fins, que o animal ${pet.name} foi atendido nesta data e apresenta:\n\n${
        r.diagnosis ?? "—"
      }\n\nObservações: ${r.observations ?? "—"}`,
      signatureUrl: r.signature_url ?? undefined,
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Prontuários</h1>
          <p className="text-sm text-muted-foreground">Histórico clínico, prescrições e exames</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar paciente, tutor, diagnóstico..."
              className="pl-9 w-full sm:w-80"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)} className="bg-gradient-primary w-full sm:w-auto">
                <Plus className="mr-1 h-4 w-4" /> Novo prontuário
              </Button>
            </DialogTrigger>
            <RecordDialog
              key={editing?.id ?? "new"}
              initial={editing}
              pets={pets}
              organizationId={organizationId}
              onSaved={() => { setOpen(false); setEditing(null); }}
            />
          </Dialog>
        </div>
      </header>

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Stethoscope className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Nenhum prontuário ainda</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {filtered.map((r, i) => {
            const pet = petById.get(r.pet_id);
            const client = pet ? clientById.get(pet.client_id) : null;
            return (
              <motion.li
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="rounded-xl border border-border bg-card/60 p-4 backdrop-blur"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium text-base">{pet?.name ?? "Paciente"}</h3>
                      <Badge variant="outline" className="text-[10px] whitespace-nowrap">
                        <Calendar className="mr-1 h-3 w-3" />
                        {new Date(r.appointment_date).toLocaleDateString("pt-BR")}
                      </Badge>
                      {client && <span className="text-xs text-muted-foreground break-all">Tutor: {client.name}</span>}
                      {r.signature_url && <Badge className="bg-primary/15 text-primary text-[10px] whitespace-nowrap"><FileSignature className="mr-1 h-3 w-3" />Assinado</Badge>}
                    </div>
                    {r.diagnosis && <p className="mt-2 text-sm"><span className="text-muted-foreground">Diagnóstico:</span> {r.diagnosis}</p>}
                    {r.prescription && <p className="mt-1 text-sm line-clamp-2"><span className="text-muted-foreground">Prescrição:</span> {r.prescription}</p>}
                  </div>
                  <div className="flex items-center gap-1 self-end sm:self-start pt-2 sm:pt-0 border-t border-border/40 sm:border-0 w-full sm:w-auto justify-end">
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Receita PDF" onClick={() => printRx(r)}><FileDown className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Atestado PDF" onClick={() => printAt(r)}><FileSignature className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-500" title="Enviar por WhatsApp" onClick={() => setSharing(r)}>
                      <WhatsAppIcon className="h-4 w-4 fill-[#25D366]" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}

      <WhatsAppShareDialog
        open={!!sharing}
        onOpenChange={(o) => { if (!o) setSharing(null); }}
        record={sharing}
        pet={sharing ? petById.get(sharing.pet_id) ?? null : null}
        client={sharing ? (() => {
          const p = petById.get(sharing.pet_id);
          return p ? clientById.get(p.client_id) ?? null : null;
        })() : null}
        vet={vetInfo}
      />
    </div>
  );
}

function RecordDialog({
  initial, pets, organizationId, onSaved,
}: { initial: MedRecord | null; pets: Pet[]; organizationId: string | null; onSaved: () => void }) {
  const col = useRxCollection("medical_records");
  const [form, setForm] = useState({
    pet_id: initial?.pet_id ?? "",
    appointment_date: initial?.appointment_date?.slice(0, 16) ?? new Date().toISOString().slice(0, 16),
    weight: initial?.weight?.toString() ?? "",
    temperature: initial?.temperature?.toString() ?? "",
    anamnesis: initial?.anamnesis ?? "",
    symptoms: initial?.symptoms ?? "",
    diagnosis: initial?.diagnosis ?? "",
    prescription: initial?.prescription ?? "",
    observations: initial?.observations ?? "",
  });
  const [attachments, setAttachments] = useState<AttachedFile[]>(initial?.attachments ?? []);
  const [signature, setSignature] = useState<string | null>(initial?.signature_url ?? null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.pet_id) { toast.error("Selecione o paciente"); return; }
    if (!col) return;
    setSaving(true);
    try {
      const pet = pets.find((p) => p.id === form.pet_id);
      const now = new Date().toISOString();
      const payload = {
        ...form,
        client_id: pet?.client_id ?? null,
        weight: form.weight ? Number(form.weight) : null,
        temperature: form.temperature ? Number(form.temperature) : null,
        appointment_date: new Date(form.appointment_date).toISOString(),
        attachments,
        signature_url: signature,
        updated_at: now,
      };
      if (initial) {
        const doc = await col.findOne(initial.id).exec();
        if (doc) await doc.incrementalPatch(payload);
        toast.success("Prontuário atualizado");
      } else {
        await col.insert({ id: uuid(), organization_id: organizationId, ...payload, is_deleted: false, created_at: now });
        toast.success("Prontuário salvo");
      }
      onSaved();
    } catch (e) {
      toast.error("Erro: " + (e as Error).message);
    } finally { setSaving(false); }
  };

  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{initial ? "Editar prontuário" : "Novo prontuário"}</DialogTitle>
      </DialogHeader>
      <Tabs defaultValue="clinico">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="clinico">Clínico</TabsTrigger>
          <TabsTrigger value="anexos">Anexos</TabsTrigger>
          <TabsTrigger value="assinatura">Assinatura</TabsTrigger>
        </TabsList>

        <TabsContent value="clinico" className="space-y-3 pt-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Paciente *</Label>
              <Select value={form.pet_id} onValueChange={(v) => setForm({ ...form, pet_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {pets.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data / hora</Label>
              <Input type="datetime-local" value={form.appointment_date}
                onChange={(e) => setForm({ ...form, appointment_date: e.target.value })} />
            </div>
            <div>
              <Label>Peso (kg)</Label>
              <Input type="number" step="0.1" value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })} />
            </div>
            <div>
              <Label>Temperatura (°C)</Label>
              <Input type="number" step="0.1" value={form.temperature}
                onChange={(e) => setForm({ ...form, temperature: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Anamnese</Label>
            <Textarea rows={2} value={form.anamnesis} onChange={(e) => setForm({ ...form, anamnesis: e.target.value })} />
          </div>
          <div>
            <Label>Sintomas</Label>
            <Textarea rows={2} value={form.symptoms} onChange={(e) => setForm({ ...form, symptoms: e.target.value })} />
          </div>
          <div>
            <Label>Diagnóstico</Label>
            <Textarea rows={2} value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} />
          </div>
          <div>
            <Label>Prescrição</Label>
            <Textarea rows={4} value={form.prescription} onChange={(e) => setForm({ ...form, prescription: e.target.value })} />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea rows={2} value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} />
          </div>
        </TabsContent>

        <TabsContent value="anexos" className="pt-3">
          <Label>Exames, imagens e documentos</Label>
          <FileDrop value={attachments} onChange={setAttachments} folder="records" />
        </TabsContent>

        <TabsContent value="assinatura" className="space-y-3 pt-3">
          <Label>Assinatura digital do veterinário</Label>
          {signature ? (
            <div className="space-y-2">
              <img src={signature} alt="Assinatura" className="h-32 rounded-lg border border-border bg-white object-contain" />
              <Button variant="outline" size="sm" onClick={() => setSignature(null)}>Refazer</Button>
            </div>
          ) : (
            <SignaturePad onSave={setSignature} />
          )}
        </TabsContent>
      </Tabs>

      <DialogFooter>
        <Button onClick={submit} disabled={saving} className="bg-gradient-primary">
          {saving ? "Salvando..." : "Salvar prontuário"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
