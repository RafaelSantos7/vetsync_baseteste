import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, PawPrint, Pencil, Trash2 } from "lucide-react";

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
import { ImageUpload } from "@/components/image-upload";
import { useRxQuery, useRxCollection } from "@/hooks/use-rx";

export const Route = createFileRoute("/_authenticated/animais")({
  component: AnimaisPage,
});

type Pet = {
  id: string;
  client_id: string;
  name: string;
  species: string | null;
  breed: string | null;
  sex: string | null;
  birth_date: string | null;
  weight: number | null;
  color: string | null;
  neutered: boolean | null;
  allergies: string | null;
  diseases: string | null;
  medications: string | null;
  photo_urls?: string[] | null;
};
type Client = { id: string; name: string };

const empty = {
  client_id: "",
  name: "",
  species: "cao",
  breed: "",
  sex: "M",
  birth_date: "",
  weight: "",
  color: "",
  neutered: false,
  allergies: "",
  diseases: "",
  medications: "",
  photo_urls: [] as string[],
};

function uuid() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    Math.random().toString(36).slice(2) + Date.now().toString(36)
  );
}

function AnimaisPage() {
  const petsCol = useRxCollection("pets");
  const { data: pets = [], isLoading } = useRxQuery<Pet>("pets", {
    selector: { is_deleted: { $ne: true } },
    sort: [{ name: "asc" }],
  });
  const { data: clients = [] } = useRxQuery<Client>("clients", {
    selector: { is_deleted: { $ne: true } },
  });
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Pet | null>(null);
  const [form, setForm] = useState<typeof empty>(empty);

  const filtered = pets.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.breed ?? "").toLowerCase().includes(q) ||
      (clientMap.get(p.client_id) ?? "").toLowerCase().includes(q)
    );
  });

  function openNew() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }
  function openEdit(p: Pet) {
    setEditing(p);
    setForm({
      client_id: p.client_id,
      name: p.name,
      species: p.species ?? "cao",
      breed: p.breed ?? "",
      sex: p.sex ?? "M",
      birth_date: p.birth_date ?? "",
      weight: p.weight?.toString() ?? "",
      color: p.color ?? "",
      neutered: !!p.neutered,
      allergies: p.allergies ?? "",
      diseases: p.diseases ?? "",
      medications: p.medications ?? "",
      photo_urls: (p.photo_urls ?? []) as string[],
    });
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim() || !form.client_id) {
      toast.error("Informe nome e tutor.");
      return;
    }
    if (!petsCol) return;
    const payload = {
      ...form,
      weight: form.weight ? Number(form.weight) : null,
      birth_date: form.birth_date || null,
    };
    try {
      const now = new Date().toISOString();
      if (editing) {
        const doc = await petsCol.findOne(editing.id).exec();
        if (doc) await doc.incrementalPatch({ ...payload, updated_at: now });
      } else {
        await petsCol.insert({
          id: uuid(),
          ...payload,
          is_deleted: false,
          created_at: now,
          updated_at: now,
        });
      }
      toast.success(editing ? "Animal atualizado." : "Animal cadastrado.");
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function remove(p: Pet) {
    if (!confirm(`Excluir ${p.name}?`)) return;
    if (!petsCol) return;
    try {
      const doc = await petsCol.findOne(p.id).exec();
      if (doc) await doc.remove();
      toast.success("Animal excluído.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold md:text-3xl">Animais</h1>
          <p className="text-sm text-muted-foreground">Pacientes cadastrados na clínica.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="gap-1.5">
              <Plus className="h-4 w-4" /> Novo animal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl w-[95dvw] h-[90dvh] sm:h-auto overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar animal" : "Novo animal"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2 pb-20 sm:pb-0">
              <div className="sm:col-span-2">
                <Label className="text-xs">Tutor *</Label>
                <Select
                  value={form.client_id}
                  onValueChange={(v) => setForm({ ...form, client_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tutor" />
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
              <F label="Nome *" v={form.name} on={(v) => setForm({ ...form, name: v })} />
              <div>
                <Label className="text-xs">Espécie</Label>
                <Select
                  value={form.species}
                  onValueChange={(v) => setForm({ ...form, species: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cao">Cão</SelectItem>
                    <SelectItem value="gato">Gato</SelectItem>
                    <SelectItem value="equino">Equino</SelectItem>
                    <SelectItem value="bovino">Bovino</SelectItem>
                    <SelectItem value="ovino">Ovino</SelectItem>
                    <SelectItem value="ave">Ave</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <F label="Raça" v={form.breed} on={(v) => setForm({ ...form, breed: v })} />
              <div>
                <Label className="text-xs">Sexo</Label>
                <Select value={form.sex} onValueChange={(v) => setForm({ ...form, sex: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Macho</SelectItem>
                    <SelectItem value="F">Fêmea</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Nascimento</Label>
                <Input
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                />
              </div>
              <F
                label="Peso (kg)"
                v={form.weight}
                on={(v) => setForm({ ...form, weight: v })}
                type="number"
              />
              <F label="Pelagem / Cor" v={form.color} on={(v) => setForm({ ...form, color: v })} />
              <div className="sm:col-span-2">
                <Label className="text-xs">Alergias</Label>
                <Textarea
                  value={form.allergies}
                  onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Doenças preexistentes</Label>
                <Textarea
                  value={form.diseases}
                  onChange={(e) => setForm({ ...form, diseases: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Medicações em uso</Label>
                <Textarea
                  value={form.medications}
                  onChange={(e) => setForm({ ...form, medications: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Fotos do animal</Label>
                <ImageUpload
                  value={form.photo_urls}
                  onChange={(urls) => setForm({ ...form, photo_urls: urls })}
                  folder="pets"
                  label=""
                />
              </div>
            </div>
            <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t sm:relative sm:border-0 sm:pt-0 mt-auto">
              <Button variant="ghost" onClick={() => setOpen(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button onClick={save} className="w-full sm:w-auto bg-gradient-primary">
                {editing ? "Salvar Alterações" : "Cadastrar Animal"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="glass flex items-center gap-2 rounded-xl p-2.5 shadow-elegant">
        <Search className="ml-1 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, raça ou tutor…"
          className="border-0 bg-transparent focus-visible:ring-0"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center gap-3 rounded-xl p-12 text-center shadow-elegant">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <PawPrint className="h-6 w-6" />
          </div>
          <p className="text-sm text-muted-foreground">Nenhum animal cadastrado.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass group relative rounded-xl p-4 shadow-elegant"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <PawPrint className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold leading-tight">{p.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {clientMap.get(p.client_id) ?? "—"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-100 md:opacity-0 transition group-hover:opacity-100">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => openEdit(p)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    onClick={() => remove(p)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.species && (
                  <Badge variant="secondary" className="text-[10px]">
                    {p.species}
                  </Badge>
                )}
                {p.breed && (
                  <Badge variant="outline" className="text-[10px]">
                    {p.breed}
                  </Badge>
                )}
                {p.sex && (
                  <Badge variant="outline" className="text-[10px]">
                    {p.sex === "M" ? "Macho" : "Fêmea"}
                  </Badge>
                )}
                {p.weight && (
                  <Badge variant="outline" className="text-[10px]">
                    {p.weight} kg
                  </Badge>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function F({
  label,
  v,
  on,
  type = "text",
}: {
  label: string;
  v: string;
  on: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={v} onChange={(e) => on(e.target.value)} />
    </div>
  );
}
