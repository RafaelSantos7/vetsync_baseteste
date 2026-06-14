import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Phone, Mail, MapPin, Pencil, Trash2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRxQuery, getCollection } from "@/hooks/use-rx";

export const Route = createFileRoute("/_authenticated/clientes")({
  component: ClientesPage,
});

type Client = {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  document: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
};

const empty: Omit<Client, "id"> = {
  name: "",
  phone: "",
  whatsapp: "",
  email: "",
  document: "",
  address: "",
  city: "",
  notes: "",
};

function uuid() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    Math.random().toString(36).slice(2) + Date.now().toString(36)
  );
}

function ClientesPage() {
  const { data: rawClients = [], isLoading } = useRxQuery<Client>("clients", {
    selector: { is_deleted: { $ne: true } },
    sort: [{ name: "asc" }],
  });
  const clients = [...rawClients].sort((a, b) => a.name.localeCompare(b.name));

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<Omit<Client, "id">>(empty);

  const filtered = clients.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone ?? "").includes(search) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.city ?? "").toLowerCase().includes(q)
    );
  });

  function openNew() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }
  function openEdit(c: Client) {
    setEditing(c);
    setForm({
      name: c.name,
      phone: c.phone ?? "",
      whatsapp: c.whatsapp ?? "",
      email: c.email ?? "",
      document: c.document ?? "",
      address: c.address ?? "",
      city: c.city ?? "",
      notes: c.notes ?? "",
    });
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }
    try {
      const collection = await getCollection("clients");
      const now = new Date().toISOString();
      if (editing) {
        const doc = await collection.findOne(editing.id).exec();
        if (doc) await doc.incrementalPatch({ ...form, updated_at: now });
        toast.success("Cliente atualizado.");
      } else {
        await collection.insert({
          id: uuid(),
          ...form,
          is_deleted: false,
          created_at: now,
          updated_at: now,
        });
        toast.success("Cliente cadastrado.");
      }
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function remove(c: Client) {
    if (!confirm(`Excluir ${c.name}?`)) return;
    try {
      const collection = await getCollection("clients");
      const doc = await collection.findOne(c.id).exec();
      if (doc) await doc.remove();
      toast.success("Cliente excluído.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold md:text-3xl">Clientes</h1>
          <p className="text-sm text-muted-foreground">Tutores e proprietários cadastrados.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="gap-1.5">
              <Plus className="h-4 w-4" /> Novo cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl w-[95dvw] h-[90dvh] sm:h-auto overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{editing ? "Editar cliente" : "Novo cliente"}</span>
                {editing && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(editing);
                      setOpen(false);
                    }}
                    className="hidden sm:flex text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2 pb-20 sm:pb-0">
              <Field
                label="Nome *"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                className="sm:col-span-2"
              />
              <Field
                label="Telefone"
                value={form.phone ?? ""}
                onChange={(v) => setForm({ ...form, phone: v })}
              />
              <Field
                label="WhatsApp"
                value={form.whatsapp ?? ""}
                onChange={(v) => setForm({ ...form, whatsapp: v })}
              />
              <Field
                label="Email"
                value={form.email ?? ""}
                onChange={(v) => setForm({ ...form, email: v })}
              />
              <Field
                label="Documento"
                value={form.document ?? ""}
                onChange={(v) => setForm({ ...form, document: v })}
              />
              <Field
                label="Endereço"
                value={form.address ?? ""}
                onChange={(v) => setForm({ ...form, address: v })}
                className="sm:col-span-2"
              />
              <Field
                label="Cidade"
                value={form.city ?? ""}
                onChange={(v) => setForm({ ...form, city: v })}
              />
              <div className="sm:col-span-2">
                <Label className="text-xs">Observações</Label>
                <Textarea
                  value={form.notes ?? ""}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t sm:relative sm:border-0 sm:pt-0 mt-auto flex flex-col gap-2">
              <div className="flex w-full gap-2">
                <Button variant="ghost" onClick={() => setOpen(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={save} className="flex-1 bg-gradient-primary">
                  {editing ? "Salvar" : "Cadastrar"}
                </Button>
              </div>
              {editing && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    remove(editing);
                    setOpen(false);
                  }}
                  className="w-full mt-2 sm:hidden"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Excluir Cliente
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="glass flex items-center gap-2 rounded-xl p-2.5 shadow-elegant">
        <Search className="ml-1 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, telefone, email ou cidade…"
          className="border-0 bg-transparent focus-visible:ring-0"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center gap-3 rounded-xl p-12 text-center shadow-elegant">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Users className="h-6 w-6" />
          </div>
          <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado ainda.</p>
          <Button onClick={openNew} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Cadastrar primeiro
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => openEdit(c)}
              className="glass group relative flex flex-col justify-between rounded-xl p-4 shadow-elegant cursor-pointer hover:border-primary/40 transition-colors"
            >
              <div className="flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-lg">{c.name}</h3>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground group-hover:text-primary"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {c.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-primary/70" /> {c.phone}
                      </div>
                    )}
                    {c.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary/70" /> {c.email}
                      </div>
                    )}
                    {c.city && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary/70" /> {c.city}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between pt-3 border-t border-border/50">
                  <span className="text-xs font-medium text-primary/80 group-hover:text-primary">
                    Ver detalhes
                  </span>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(c);
                    }}
                  >
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
