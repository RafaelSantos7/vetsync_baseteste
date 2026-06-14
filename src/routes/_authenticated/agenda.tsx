import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { addDays, addWeeks, format, isSameDay, startOfWeek, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalIcon, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { useRxQuery, useRxCollection, uuid } from "@/hooks/use-rx";

export const Route = createFileRoute("/_authenticated/agenda")({
  component: AgendaPage,
});

type Appt = {
  id: string;
  pet_id: string | null;
  client_id: string | null;
  title: string;
  category: string;
  scheduled_at: string;
  status: string;
  notes: string | null;
  duration_min: number | null;
};

const CATEGORIES: { value: string; label: string; color: string }[] = [
  { value: "consulta", label: "Consulta", color: "bg-primary/20 text-primary border-primary/40" },
  {
    value: "cirurgia",
    label: "Cirurgia",
    color: "bg-destructive/20 text-destructive border-destructive/40",
  },
  { value: "vacina", label: "Vacina", color: "bg-success/20 text-success border-success/40" },
  {
    value: "odonto",
    label: "Odonto",
    color: "bg-accent/20 text-accent-foreground border-accent/40",
  },
  { value: "rural", label: "Rural", color: "bg-warning/20 text-warning border-warning/40" },
];
const catColor = (c: string) => CATEGORIES.find((x) => x.value === c)?.color ?? CATEGORIES[0].color;

function AgendaPage() {
  const apptsCol = useRxCollection("appointments");
  const [anchor, setAnchor] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category: "consulta",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "09:00",
    duration_min: "30",
    client_id: "",
    pet_id: "",
    notes: "",
  });

  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const rangeStart = weekStart.toISOString();
  const rangeEnd = addDays(weekStart, 7).toISOString();

  const { data: allAppts = [] } = useRxQuery<Appt>("appointments", {
    selector: { is_deleted: { $ne: true } },
  });
  const appts = allAppts.filter((a) => a.scheduled_at >= rangeStart && a.scheduled_at < rangeEnd);

  const { data: clients = [] } = useRxQuery<{ id: string; name: string }>("clients", {
    selector: { is_deleted: { $ne: true } },
  });
  const { data: pets = [] } = useRxQuery<{ id: string; name: string; client_id: string }>("pets", {
    selector: { is_deleted: { $ne: true } },
  });
  const filteredPets = pets.filter((p) => !form.client_id || p.client_id === form.client_id);

  async function save() {
    if (!form.title.trim()) {
      toast.error("Informe o título do agendamento.");
      return;
    }
    if (!apptsCol) return;
    const dt = new Date(`${form.date}T${form.time}:00`);
    try {
      const now = new Date().toISOString();
      await apptsCol.insert({
        id: uuid(),
        title: form.title,
        category: form.category,
        scheduled_at: dt.toISOString(),
        duration_min: Number(form.duration_min) || 30,
        client_id: form.client_id || null,
        pet_id: form.pet_id || null,
        notes: form.notes || null,
        status: "agendado",
        is_deleted: false,
        created_at: now,
        updated_at: now,
      });
      toast.success("Agendamento criado.");
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function remove(id: string) {
    if (!confirm("Excluir agendamento?") || !apptsCol) return;
    try {
      const doc = await apptsCol.findOne(id).exec();
      if (doc) await doc.remove();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold md:text-3xl">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            Semana de {format(weekStart, "d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setAnchor(subWeeks(anchor, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" onClick={() => setAnchor(addWeeks(anchor, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5">
                <Plus className="h-4 w-4" /> Novo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Novo agendamento</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label className="text-xs">Título *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Categoria</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm({ ...form, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Duração (min)</Label>
                  <Input
                    type="number"
                    value={form.duration_min}
                    onChange={(e) => setForm({ ...form, duration_min: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Data</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Hora</Label>
                  <Input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Tutor</Label>
                  <Select
                    value={form.client_id}
                    onValueChange={(v) => setForm({ ...form, client_id: v, pet_id: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Animal</Label>
                  <Select
                    value={form.pet_id}
                    onValueChange={(v) => setForm({ ...form, pet_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredPets.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Notas</Label>
                  <Textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={save}>Agendar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
        {days.map((d, i) => {
          const dayAppts = appts
            .filter((a) => isSameDay(new Date(a.scheduled_at), d))
            .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
          const isToday = isSameDay(d, new Date());
          return (
            <motion.div
              key={d.toISOString()}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`glass flex min-h-48 flex-col rounded-xl p-3 shadow-elegant ${isToday ? "ring-1 ring-primary/40" : ""}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {format(d, "EEE", { locale: ptBR })}
                  </div>
                  <div
                    className={`font-display text-lg font-semibold ${isToday ? "text-primary" : ""}`}
                  >
                    {format(d, "d")}
                  </div>
                </div>
                <CalIcon className="h-3.5 w-3.5 text-muted-foreground/50" />
              </div>
              <div className="space-y-1.5">
                {dayAppts.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground/50">—</p>
                ) : (
                  dayAppts.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => remove(a.id)}
                      className={`block w-full rounded-md border px-2 py-1.5 text-left text-[11px] transition hover:opacity-80 ${catColor(a.category)}`}
                    >
                      <div className="flex items-center gap-1 font-medium">
                        <Clock className="h-2.5 w-2.5" />
                        {format(new Date(a.scheduled_at), "HH:mm")}
                      </div>
                      <div className="mt-0.5 truncate">{a.title}</div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {CATEGORIES.map((c) => (
          <span key={c.value} className={`rounded-md border px-2 py-1 ${c.color}`}>
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}
