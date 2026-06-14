import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  MapPin,
  Tractor,
  Search,
  Trash2,
  Crosshair,
  Users as HerdIcon,
  CalendarClock,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useRxQuery, useRxCollection, uuid } from "@/hooks/use-rx";

export const Route = createFileRoute("/_authenticated/rural")({
  component: RuralPage,
});

type Client = { id: string; name: string };
type Property = {
  id: string;
  name: string;
  client_id: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  area_hectares: number | null;
  notes: string | null;
};
type Herd = {
  id: string;
  property_id: string;
  identification: string;
  species: string | null;
  breed: string | null;
  sex: string | null;
  birth_date: string | null;
  status: string;
  notes: string | null;
};
type Visit = {
  id: string;
  property_id: string;
  scheduled_at: string;
  completed_at: string | null;
  latitude: number | null;
  longitude: number | null;
  purpose: string | null;
  notes: string | null;
};

function RuralPage() {
  const propsCol = useRxCollection("properties");
  const [selected, setSelected] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [openProp, setOpenProp] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);

  const { data: clients = [] } = useRxQuery<Client>("clients", {
    selector: { is_deleted: { $ne: true } },
  });
  const { data: rawProps = [], isLoading } = useRxQuery<Property>("properties", {
    selector: { is_deleted: { $ne: true } },
  });
  const properties = [...rawProps].sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    if (!selected && properties[0]) setSelected(properties[0].id);
  }, [properties, selected]);

  const filtered = properties.filter(
    (p) => !q || `${p.name} ${p.city ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );

  const removeProp = async (id: string) => {
    if (!confirm("Excluir propriedade e seus registros?") || !propsCol) return;
    const doc = await propsCol.findOne(id).exec();
    if (doc) await doc.remove();
    if (selected === id) setSelected(null);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Visitas Rurais</h1>
          <p className="text-sm text-muted-foreground">
            Propriedades, rebanhos e atendimentos a campo
          </p>
        </div>
        <Dialog
          open={openProp}
          onOpenChange={(o) => {
            setOpenProp(o);
            if (!o) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary">
              <Plus className="mr-1 h-4 w-4" />
              Nova propriedade
            </Button>
          </DialogTrigger>
          <PropertyDialog
            editing={editing}
            clients={clients}
            onClose={() => {
              setOpenProp(false);
              setEditing(null);
            }}
          />
        </Dialog>
      </header>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar propriedade..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          {isLoading ? (
            <Skeleton className="h-32" />
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              Nenhuma propriedade cadastrada.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {filtered.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => setSelected(p.id)}
                    className={`w-full rounded-lg border p-3 text-left transition ${selected === p.id ? "border-primary bg-primary/10" : "border-border bg-card/40 hover:bg-card/70"}`}
                  >
                    <div className="flex items-center gap-2">
                      <Tractor className="h-4 w-4 text-primary" />
                      <span className="font-medium truncate">{p.name}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      {p.city && (
                        <span className="truncate">
                          {p.city}
                          {p.state && `/${p.state}`}
                        </span>
                      )}
                      {p.area_hectares && (
                        <Badge variant="outline" className="text-[10px]">
                          {p.area_hectares} ha
                        </Badge>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section>
          {!selected ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              Selecione uma propriedade ou crie uma nova.
            </div>
          ) : (
            <PropertyDetail
              property={properties.find((p) => p.id === selected)!}
              onEdit={() => {
                setEditing(properties.find((p) => p.id === selected)!);
                setOpenProp(true);
              }}
              onRemove={() => removeProp(selected)}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function PropertyDetail({
  property,
  onEdit,
  onRemove,
}: {
  property: Property;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="rounded-xl border border-border bg-card/60 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-display text-xl font-semibold">{property.name}</h2>
            <p className="text-sm text-muted-foreground">{property.address ?? "Sem endereço"}</p>
            {property.latitude && property.longitude && (
              <a
                target="_blank"
                rel="noreferrer"
                href={`https://www.google.com/maps?q=${property.latitude},${property.longitude}`}
                className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <MapPin className="h-3 w-3" /> {property.latitude}, {property.longitude}
              </a>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onEdit}>
              Editar
            </Button>
            <Button size="sm" variant="outline" onClick={onRemove}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="rebanho">
        <TabsList>
          <TabsTrigger value="rebanho">
            <HerdIcon className="mr-1.5 h-3.5 w-3.5" />
            Rebanho
          </TabsTrigger>
          <TabsTrigger value="visitas">
            <CalendarClock className="mr-1.5 h-3.5 w-3.5" />
            Visitas
          </TabsTrigger>
        </TabsList>
        <TabsContent value="rebanho" className="mt-4">
          <HerdTab propertyId={property.id} />
        </TabsContent>
        <TabsContent value="visitas" className="mt-4">
          <VisitsTab propertyId={property.id} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

function HerdTab({ propertyId }: { propertyId: string }) {
  const col = useRxCollection("herd_animals");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Herd | null>(null);

  const { data: rawAnimals = [] } = useRxQuery<Herd>(
    "herd_animals",
    {
      selector: { property_id: propertyId, is_deleted: { $ne: true } },
    },
    [propertyId],
  );
  const animals = [...rawAnimals].sort((a, b) => a.identification.localeCompare(b.identification));

  const stats = useMemo(() => {
    const total = animals.length;
    const por: Record<string, number> = {};
    animals.forEach((a) => {
      por[a.species ?? "—"] = (por[a.species ?? "—"] ?? 0) + 1;
    });
    return { total, por };
  }, [animals]);

  const remove = async (id: string) => {
    if (!confirm("Excluir animal?") || !col) return;
    const doc = await col.findOne(id).exec();
    if (doc) await doc.remove();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">Total: {stats.total}</Badge>
        {Object.entries(stats.por).map(([k, v]) => (
          <Badge key={k} variant="outline">
            {k}: {v}
          </Badge>
        ))}
        <div className="ml-auto">
          <Dialog
            open={open}
            onOpenChange={(o) => {
              setOpen(o);
              if (!o) setEditing(null);
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-primary">
                <Plus className="mr-1 h-3.5 w-3.5" />
                Animal
              </Button>
            </DialogTrigger>
            <HerdDialog
              editing={editing}
              propertyId={propertyId}
              onClose={() => {
                setOpen(false);
                setEditing(null);
              }}
            />
          </Dialog>
        </div>
      </div>

      {animals.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          Nenhum animal cadastrado neste rebanho.
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {animals.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card/40 p-3"
            >
              <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/15 font-mono text-xs text-primary">
                {a.identification.slice(0, 4)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{a.identification}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {a.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {[a.species, a.breed, a.sex].filter(Boolean).join(" • ") || "—"}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(a);
                  setOpen(true);
                }}
              >
                Editar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => remove(a.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function VisitsTab({ propertyId }: { propertyId: string }) {
  const col = useRxCollection("rural_visits");
  const [open, setOpen] = useState(false);

  const { data: rawVisits = [] } = useRxQuery<Visit>(
    "rural_visits",
    {
      selector: { property_id: propertyId, is_deleted: { $ne: true } },
    },
    [propertyId],
  );
  const visits = [...rawVisits].sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));

  const finalize = async (v: Visit) => {
    if (!col) return;
    const coords = await captureCoords();
    const doc = await col.findOne(v.id).exec();
    if (doc)
      await doc.incrementalPatch({
        completed_at: new Date().toISOString(),
        latitude: coords?.lat ?? v.latitude,
        longitude: coords?.lng ?? v.longitude,
        updated_at: new Date().toISOString(),
      });
    toast.success("Visita finalizada");
  };
  const remove = async (id: string) => {
    if (!confirm("Excluir visita?") || !col) return;
    const doc = await col.findOne(id).exec();
    if (doc) await doc.remove();
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-primary">
              <Plus className="mr-1 h-3.5 w-3.5" />
              Nova visita
            </Button>
          </DialogTrigger>
          <VisitDialog propertyId={propertyId} onClose={() => setOpen(false)} />
        </Dialog>
      </div>
      {visits.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          Nenhuma visita registrada.
        </div>
      ) : (
        <ul className="space-y-2">
          {visits.map((v) => (
            <li key={v.id} className="rounded-lg border border-border bg-card/40 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" />
                <span className="font-medium">
                  {new Date(v.scheduled_at).toLocaleString("pt-BR")}
                </span>
                {v.completed_at ? (
                  <Badge className="bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20">
                    Concluída
                  </Badge>
                ) : (
                  <Badge variant="outline">Agendada</Badge>
                )}
                {v.purpose && (
                  <Badge variant="outline" className="text-[10px]">
                    {v.purpose}
                  </Badge>
                )}
                <div className="ml-auto flex gap-1">
                  {!v.completed_at && (
                    <Button size="sm" variant="outline" onClick={() => finalize(v)}>
                      <Check className="mr-1 h-3.5 w-3.5" />
                      Finalizar
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => remove(v.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
              {v.notes && (
                <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{v.notes}</p>
              )}
              {v.latitude && v.longitude && (
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={`https://www.google.com/maps?q=${v.latitude},${v.longitude}`}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <MapPin className="h-3 w-3" />
                  Ver no mapa
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function captureCoords(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}

function PropertyDialog({
  editing,
  clients,
  onClose,
}: {
  editing: Property | null;
  clients: Client[];
  onClose: () => void;
}) {
  const col = useRxCollection("properties");
  const [form, setForm] = useState<Partial<Property>>(editing ?? { name: "" });
  const [saving, setSaving] = useState(false);

  const grabCoords = async () => {
    toast.info("Capturando localização...");
    const c = await captureCoords();
    if (!c) return toast.error("Não foi possível obter coordenadas");
    setForm({ ...form, latitude: c.lat, longitude: c.lng });
    toast.success("Localização capturada");
  };

  const submit = async () => {
    if (!form.name) return toast.error("Nome obrigatório");
    if (!col) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        name: form.name,
        client_id: form.client_id || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        latitude: form.latitude ?? null,
        longitude: form.longitude ?? null,
        area_hectares: form.area_hectares ?? null,
        notes: form.notes || null,
        updated_at: now,
      };
      if (editing) {
        const doc = await col.findOne(editing.id).exec();
        if (doc) await doc.incrementalPatch(payload);
      } else {
        await col.insert({ id: uuid(), ...payload, is_deleted: false, created_at: now });
      }
      toast.success("Propriedade salva");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar" : "Nova"} propriedade</DialogTitle>
      </DialogHeader>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label>Nome</Label>
          <Input
            value={form.name ?? ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Fazenda São José"
          />
        </div>
        <div className="md:col-span-2">
          <Label>Proprietário</Label>
          <Select
            value={form.client_id ?? ""}
            onValueChange={(v) => setForm({ ...form, client_id: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="—" />
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
        <div className="md:col-span-2">
          <Label>Endereço</Label>
          <Input
            value={form.address ?? ""}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>
        <div>
          <Label>Cidade</Label>
          <Input
            value={form.city ?? ""}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </div>
        <div>
          <Label>UF</Label>
          <Input
            maxLength={2}
            value={form.state ?? ""}
            onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
          />
        </div>
        <div>
          <Label>Área (ha)</Label>
          <Input
            type="number"
            step="0.01"
            value={form.area_hectares ?? ""}
            onChange={(e) =>
              setForm({ ...form, area_hectares: e.target.value ? Number(e.target.value) : null })
            }
          />
        </div>
        <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
          <div>
            <Label>Latitude</Label>
            <Input
              value={form.latitude ?? ""}
              onChange={(e) => setForm({ ...form, latitude: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Longitude</Label>
            <Input
              value={form.longitude ?? ""}
              onChange={(e) => setForm({ ...form, longitude: Number(e.target.value) })}
            />
          </div>
          <Button type="button" variant="outline" size="icon" onClick={grabCoords}>
            <Crosshair className="h-4 w-4" />
          </Button>
        </div>
        <div className="md:col-span-2">
          <Label>Notas</Label>
          <Textarea
            rows={2}
            value={form.notes ?? ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button disabled={saving} className="bg-gradient-primary" onClick={submit}>
          Salvar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function HerdDialog({
  editing,
  propertyId,
  onClose,
}: {
  editing: Herd | null;
  propertyId: string;
  onClose: () => void;
}) {
  const col = useRxCollection("herd_animals");
  const [form, setForm] = useState<Partial<Herd>>(
    editing ?? {
      identification: "",
      species: "bovino",
      status: "ativo",
    },
  );
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.identification) return toast.error("Identificação obrigatória");
    if (!col) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        property_id: propertyId,
        identification: form.identification,
        species: form.species || null,
        breed: form.breed || null,
        sex: form.sex || null,
        birth_date: form.birth_date || null,
        status: form.status ?? "ativo",
        notes: form.notes || null,
        updated_at: now,
      };
      if (editing) {
        const doc = await col.findOne(editing.id).exec();
        if (doc) await doc.incrementalPatch(payload);
      } else {
        await col.insert({ id: uuid(), ...payload, is_deleted: false, created_at: now });
      }
      toast.success("Animal salvo");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar" : "Novo"} animal</DialogTitle>
      </DialogHeader>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>Identificação / brinco</Label>
          <Input
            value={form.identification ?? ""}
            onChange={(e) => setForm({ ...form, identification: e.target.value })}
          />
        </div>
        <div>
          <Label>Espécie</Label>
          <Select
            value={form.species ?? ""}
            onValueChange={(v) => setForm({ ...form, species: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bovino">Bovino</SelectItem>
              <SelectItem value="equino">Equino</SelectItem>
              <SelectItem value="ovino">Ovino</SelectItem>
              <SelectItem value="caprino">Caprino</SelectItem>
              <SelectItem value="suino">Suíno</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Raça</Label>
          <Input
            value={form.breed ?? ""}
            onChange={(e) => setForm({ ...form, breed: e.target.value })}
          />
        </div>
        <div>
          <Label>Sexo</Label>
          <Select value={form.sex ?? ""} onValueChange={(v) => setForm({ ...form, sex: v })}>
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="macho">Macho</SelectItem>
              <SelectItem value="femea">Fêmea</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Nascimento</Label>
          <Input
            type="date"
            value={form.birth_date ?? ""}
            onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
          />
        </div>
        <div>
          <Label>Status</Label>
          <Select
            value={form.status ?? "ativo"}
            onValueChange={(v) => setForm({ ...form, status: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="tratamento">Em tratamento</SelectItem>
              <SelectItem value="vendido">Vendido</SelectItem>
              <SelectItem value="obito">Óbito</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label>Notas</Label>
          <Textarea
            rows={2}
            value={form.notes ?? ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button disabled={saving} className="bg-gradient-primary" onClick={submit}>
          Salvar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function VisitDialog({ propertyId, onClose }: { propertyId: string; onClose: () => void }) {
  const col = useRxCollection("rural_visits");
  const [form, setForm] = useState({
    scheduled_at: new Date().toISOString().slice(0, 16),
    purpose: "Atendimento",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!col) return;
    setSaving(true);
    try {
      const coords = await captureCoords();
      const now = new Date().toISOString();
      await col.insert({
        id: uuid(),
        property_id: propertyId,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        completed_at: null,
        purpose: form.purpose || null,
        notes: form.notes || null,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        deleted: false,
        created_at: now,
        updated_at: now,
      });
      toast.success("Visita agendada");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Nova visita</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Data e hora</Label>
          <Input
            type="datetime-local"
            value={form.scheduled_at}
            onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
          />
        </div>
        <div>
          <Label>Finalidade</Label>
          <Input
            value={form.purpose}
            onChange={(e) => setForm({ ...form, purpose: e.target.value })}
            placeholder="Vacinação, exame, atendimento..."
          />
        </div>
        <div>
          <Label>Notas</Label>
          <Textarea
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          A geolocalização será capturada automaticamente no momento do registro.
        </p>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button disabled={saving} className="bg-gradient-primary" onClick={submit}>
          Salvar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
