import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Search, Syringe, FileDown, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { pdfVaccineCard } from "@/lib/pdf";
import { useRxQuery, useRxCollection, uuid } from "@/hooks/use-rx";

export const Route = createFileRoute("/_authenticated/vacinas")({
  component: VacinasPage,
});

type Vaccine = {
  id: string;
  pet_id: string;
  name: string;
  applied_at: string;
  next_due: string | null;
  notes: string | null;
};
type Pet = {
  id: string;
  name: string;
  client_id: string;
  species: string | null;
  breed: string | null;
  sex: string | null;
  weight: number | null;
};
type Client = { id: string; name: string; document: string | null; phone: string | null };
type Profile = { full_name: string | null; crmv: string | null };

function statusOf(v: Vaccine): "vencida" | "proxima" | "em-dia" {
  if (!v.next_due) return "em-dia";
  const days = Math.floor((new Date(v.next_due).getTime() - Date.now()) / 86400000);
  if (days < 0) return "vencida";
  if (days <= 15) return "proxima";
  return "em-dia";
}

function VacinasPage() {
  const vaccinesCol = useRxCollection("vaccines");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [petFilter, setPetFilter] = useState<string>("all");

  const { data: pets = [] } = useRxQuery<Pet>("pets", { selector: { is_deleted: { $ne: true } } });
  const { data: clients = [] } = useRxQuery<Client>("clients", {
    selector: { is_deleted: { $ne: true } },
  });
  const { data: vaccinesRaw = [], isLoading } = useRxQuery<Vaccine>("vaccines", {
    selector: { is_deleted: { $ne: true } },
  });
  const vaccines = [...vaccinesRaw].sort((a, b) =>
    (b.applied_at ?? "").localeCompare(a.applied_at ?? ""),
  );

  // Profile still pulled from Supabase (single user record, not in offline scope).
  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name,crmv").maybeSingle();
      return data as Profile | null;
    },
  });

  const petById = useMemo(() => new Map(pets.map((p) => [p.id, p])), [pets]);

  const filtered = vaccines.filter((v) => {
    if (petFilter !== "all" && v.pet_id !== petFilter) return false;
    if (search) {
      const p = petById.get(v.pet_id);
      const q = search.toLowerCase();
      return v.name.toLowerCase().includes(q) || p?.name.toLowerCase().includes(q);
    }
    return true;
  });

  const alerts = vaccines.filter((v) => statusOf(v) !== "em-dia").length;

  const remove = async (id: string) => {
    if (!confirm("Excluir esta vacina?") || !vaccinesCol) return;
    const doc = await vaccinesCol.findOne(id).exec();
    if (doc) await doc.remove();
    toast.success("Excluída");
  };

  const printCard = (petId: string) => {
    const pet = petById.get(petId);
    if (!pet) return;
    const client = clients.find((c) => c.id === pet.client_id) ?? null;
    const list = vaccines.filter((v) => v.pet_id === petId);
    pdfVaccineCard({
      vet: {
        vetName: profile?.full_name ?? undefined,
        crmv: profile?.crmv ?? undefined,
        clinicName: "VetSystem",
      },
      pet,
      client,
      vaccines: list,
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Vacinas</h1>
          <p className="text-sm text-muted-foreground">
            Aplicações, alertas de vencimento e carteira de vacinação
            {alerts > 0 && (
              <span className="block sm:inline sm:ml-2 text-amber-500">• {alerts} alerta(s)</span>
            )}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={petFilter} onValueChange={setPetFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos pacientes</SelectItem>
              {pets.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              className="pl-9 w-full sm:w-56"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary w-full sm:w-auto">
                <Plus className="mr-1 h-4 w-4" />
                Aplicar
              </Button>
            </DialogTrigger>
            <VaccineDialog pets={pets} onSaved={() => setOpen(false)} />
          </Dialog>
        </div>
      </header>

      {isLoading ? (
        <div className="grid gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Syringe className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Nenhuma vacina registrada</p>
        </div>
      ) : (
        <ul className="grid gap-2">
          {filtered.map((v, i) => {
            const st = statusOf(v);
            const pet = petById.get(v.pet_id);
            return (
              <motion.li
                key={v.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-border bg-card/60 p-3 backdrop-blur gap-4"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      st === "vencida"
                        ? "bg-destructive/15 text-destructive"
                        : st === "proxima"
                          ? "bg-amber-500/15 text-amber-500"
                          : "bg-primary/15 text-primary"
                    }`}
                  >
                    {st === "em-dia" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm sm:text-base">{v.name}</span>
                      <Badge variant="outline" className="text-[10px] whitespace-nowrap">
                        {pet?.name ?? "?"}
                      </Badge>
                      {st === "vencida" && (
                        <Badge className="bg-destructive/20 text-destructive text-[10px] whitespace-nowrap">
                          Vencida
                        </Badge>
                      )}
                      {st === "proxima" && (
                        <Badge className="bg-amber-500/20 text-amber-500 text-[10px] whitespace-nowrap">
                          Próxima
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Aplicada {new Date(v.applied_at).toLocaleDateString("pt-BR")}
                      {v.next_due && (
                        <span className="block sm:inline">
                          {" "}
                          • Próxima {new Date(v.next_due).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 self-end sm:self-auto pt-2 sm:pt-0 border-t border-border/40 sm:border-0 w-full sm:w-auto justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Carteira PDF"
                    onClick={() => printCard(v.pet_id)}
                  >
                    <FileDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => remove(v.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function VaccineDialog({ pets, onSaved }: { pets: Pet[]; onSaved: () => void }) {
  const col = useRxCollection("vaccines");
  const [form, setForm] = useState({
    pet_id: "",
    name: "",
    applied_at: new Date().toISOString().slice(0, 10),
    next_due: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.pet_id || !form.name) {
      toast.error("Preencha paciente e vacina");
      return;
    }
    if (!col) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      await col.insert({
        id: uuid(),
        pet_id: form.pet_id,
        name: form.name,
        applied_at: form.applied_at,
        next_due: form.next_due || null,
        notes: form.notes || null,
        is_deleted: false,
        created_at: now,
        updated_at: now,
      });
      toast.success("Vacina registrada");
      onSaved();
    } catch (e) {
      toast.error("Erro: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Aplicar vacina</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Paciente *</Label>
          <Select value={form.pet_id} onValueChange={(v) => setForm({ ...form, pet_id: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {pets.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Vacina *</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="V10, Antirrábica, ..."
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Aplicação</Label>
            <Input
              type="date"
              value={form.applied_at}
              onChange={(e) => setForm({ ...form, applied_at: e.target.value })}
            />
          </div>
          <div>
            <Label>Próxima dose</Label>
            <Input
              type="date"
              value={form.next_due}
              onChange={(e) => setForm({ ...form, next_due: e.target.value })}
            />
          </div>
        </div>
        <div>
          <Label>Notas</Label>
          <Textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={submit} disabled={saving} className="bg-gradient-primary">
          {saving ? "Salvando..." : "Registrar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
