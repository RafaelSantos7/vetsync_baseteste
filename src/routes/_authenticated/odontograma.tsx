import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, FileDown, Trash2, Calendar, Save, Search, Link2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { EquineOdontogram, type ToothState } from "@/components/equine-odontogram";
import { STATUS_LABEL, type ToothStatus } from "@/lib/triadan";
import { ImageUpload } from "@/components/image-upload";
import { jsPDF } from "jspdf";
import { useRxQuery, useRxCollection, uuid } from "@/hooks/use-rx";

export const Route = createFileRoute("/_authenticated/odontograma")({
  component: OdontogramaPage,
});

type Pet = {
  id: string;
  name: string;
  client_id: string;
  species: string | null;
  breed: string | null;
  sex: string | null;
  weight: number | null;
};
type Odontogram = { id: string; pet_id: string | null; exam_date: string; notes: string | null };
type ToothRow = {
  id: string;
  odontogram_id: string;
  tooth_number: number;
  status: ToothStatus;
  procedure: string | null;
  notes: string | null;
  images?: string[] | null;
};

function OdontogramaPage() {
  const odoCol = useRxCollection("odontograms");
  const toothCol = useRxCollection("odontogram_teeth");
  const [odoId, setOdoId] = useState<string | null>(null);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);

  const { data: rawPets = [] } = useRxQuery<Pet>("pets", {
    selector: { is_deleted: { $ne: true } },
  });
  const pets = [...rawPets].sort((a, b) => a.name.localeCompare(b.name));
  const petsMap = useMemo(() => new Map(pets.map((p) => [p.id, p])), [pets]);

  const { data: rawOdos = [] } = useRxQuery<Odontogram>("odontograms", {
    selector: { is_deleted: { $ne: true } },
  });
  const allOdos = [...rawOdos].sort((a, b) => b.exam_date.localeCompare(a.exam_date));

  const filteredOdos = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return allOdos;
    return allOdos.filter((o) => {
      const pet = o.pet_id ? petsMap.get(o.pet_id) : null;
      return (
        (pet?.name ?? "").toLowerCase().includes(q) ||
        (pet?.breed ?? "").toLowerCase().includes(q) ||
        (o.notes ?? "").toLowerCase().includes(q) ||
        (!o.pet_id && "sem paciente".includes(q))
      );
    });
  }, [allOdos, petsMap, search]);

  const currentOdo = odoId ? (allOdos.find((o) => o.id === odoId) ?? null) : null;
  const currentPet = currentOdo?.pet_id ? (petsMap.get(currentOdo.pet_id) ?? null) : null;

  const { data: teeth = [] } = useRxQuery<ToothRow>(
    "odontogram_teeth",
    {
      selector: { odontogram_id: odoId ?? "__none__", is_deleted: { $ne: true } },
    },
    [odoId],
  );

  const teethMap = useMemo(() => {
    const m: Record<number, ToothState> = {};
    teeth.forEach((t) => {
      m[t.tooth_number] = t;
    });
    return m;
  }, [teeth]);

  const createOdo = async (petId: string | null) => {
    if (!odoCol) return;
    const now = new Date().toISOString();
    const id = uuid();
    try {
      await odoCol.insert({
        id,
        pet_id: petId,
        exam_date: now,
        notes: null,
        is_deleted: false,
        created_at: now,
        updated_at: now,
      });
      setOdoId(id);
      if (!petId)
        toast.message("Ficha criada sem paciente", {
          description: "Lembre-se de vincular a um animal cadastrado.",
        });
      else toast.success("Nova ficha criada");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const removeOdo = async () => {
    if (!odoId || !confirm("Excluir esta ficha?") || !odoCol) return;
    const doc = await odoCol.findOne(odoId).exec();
    if (doc) await doc.remove();
    setOdoId(null);
  };

  const linkPet = async (petId: string) => {
    if (!odoId || !odoCol) return;
    const doc = await odoCol.findOne(odoId).exec();
    if (doc) await doc.incrementalPatch({ pet_id: petId, updated_at: new Date().toISOString() });
    setLinkOpen(false);
    toast.success("Paciente vinculado à ficha");
  };

  const upsertTooth = async (n: number, patch: Partial<ToothRow>) => {
    if (!odoId || !toothCol) return;
    const existing = teethMap[n] as ToothRow | undefined;
    const now = new Date().toISOString();
    if (existing?.id) {
      const doc = await toothCol.findOne(existing.id).exec();
      if (doc) await doc.incrementalPatch({ ...patch, updated_at: now });
    } else {
      await toothCol.insert({
        id: uuid(),
        odontogram_id: odoId,
        tooth_number: n,
        status: "sadio",
        procedure: null,
        notes: null,
        images: [],
        ...patch,
        is_deleted: false,
        created_at: now,
        updated_at: now,
      });
    }
  };

  const exportPDF = () => {
    if (!odoId) return;
    const odo = currentOdo;
    const pet = currentPet;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFillColor(20, 30, 48);
    doc.rect(0, 0, 297, 24, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("FICHA ODONTOLÓGICA EQUINA", 14, 12);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Paciente: ${pet?.name ?? "— sem vínculo —"}  •  ${pet?.breed ?? ""}  •  ${pet?.sex ?? ""}`,
      14,
      19,
    );
    doc.text(
      `Data: ${new Date(odo?.exam_date ?? Date.now()).toLocaleDateString("pt-BR")}`,
      240,
      19,
    );
    doc.setTextColor(0, 0, 0);

    let y = 34;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Dentes registrados (Triadan):", 14, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const rows = teeth.filter((t) => t.status !== "sadio" || t.procedure || t.notes);
    if (!rows.length) {
      doc.text("Nenhuma alteração registrada — arcada íntegra.", 14, y);
    } else {
      doc.setFillColor(240, 240, 245);
      doc.rect(14, y - 4, 269, 7, "F");
      doc.setFont("helvetica", "bold");
      doc.text("Dente", 18, y);
      doc.text("Status", 50, y);
      doc.text("Procedimento", 100, y);
      doc.text("Observações", 180, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      [...rows]
        .sort((a, b) => a.tooth_number - b.tooth_number)
        .forEach((t) => {
          if (y > 195) {
            doc.addPage();
            y = 20;
          }
          doc.text(String(t.tooth_number), 18, y);
          doc.text(STATUS_LABEL[t.status] ?? t.status, 50, y);
          doc.text((t.procedure ?? "—").slice(0, 40), 100, y);
          doc.text((t.notes ?? "—").slice(0, 50), 180, y);
          y += 6;
        });
    }
    if (odo?.notes) {
      y += 6;
      doc.setFont("helvetica", "bold");
      doc.text("Notas gerais:", 14, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.text(doc.splitTextToSize(odo.notes, 269), 14, y);
    }
    doc.save(`odontograma-${pet?.name ?? "ficha"}.pdf`);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Odontograma Equino</h1>
            <p className="text-sm text-muted-foreground">
              Triadan — clique no dente para registrar procedimento
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => createOdo(null)} variant="outline">
              <Plus className="mr-1 h-4 w-4" /> Nova ficha (sem paciente)
            </Button>
            {pets.length > 0 && <CreateWithPet pets={pets} onCreate={(id) => createOdo(id)} />}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-border bg-card/40 p-2">
          <Search className="ml-1 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por paciente, raça ou observação…"
            className="border-0 bg-transparent focus-visible:ring-0"
          />
        </div>
      </header>

      {!odoId && (
        <div className="grid gap-2">
          {filteredOdos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <Calendar className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Nenhuma ficha ainda. Crie uma nova ficha acima.
              </p>
            </div>
          ) : (
            filteredOdos.map((o) => {
              const pet = o.pet_id ? petsMap.get(o.pet_id) : null;
              return (
                <button
                  key={o.id}
                  onClick={() => setOdoId(o.id)}
                  className="flex items-center justify-between rounded-xl border border-border bg-card/60 p-3 text-left transition hover:border-primary/50 hover:bg-card"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{pet?.name ?? "— sem paciente —"}</span>
                      {!pet && (
                        <Badge
                          variant="outline"
                          className="border-amber-500/40 text-amber-500 text-[10px]"
                        >
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          vincular
                        </Badge>
                      )}
                      {pet?.breed && (
                        <span className="text-xs text-muted-foreground">{pet.breed}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(o.exam_date).toLocaleString("pt-BR")}
                    </p>
                    {o.notes && (
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{o.notes}</p>
                    )}
                  </div>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </button>
              );
            })
          )}
        </div>
      )}

      {odoId && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/60 p-3">
            <Button variant="ghost" size="sm" onClick={() => setOdoId(null)}>
              ← Voltar
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{currentPet?.name ?? "— Sem paciente —"}</span>
                {currentPet ? (
                  <Badge variant="outline" className="text-[10px]">
                    {currentPet.breed ?? ""}
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/15 text-amber-500 text-[10px]">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    sem paciente vinculado
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {currentOdo && new Date(currentOdo.exam_date).toLocaleString("pt-BR")}
              </p>
            </div>
            {!currentPet && pets.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => setLinkOpen(true)}>
                <Link2 className="mr-1 h-4 w-4" /> Vincular paciente
              </Button>
            )}
            <Button onClick={exportPDF} size="sm" variant="outline">
              <FileDown className="mr-1 h-4 w-4" />
              PDF
            </Button>
            <Button onClick={removeOdo} size="sm" variant="outline">
              <Trash2 className="mr-1 h-4 w-4 text-destructive" />
            </Button>
          </div>

          {!currentPet && pets.length === 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300">
              Você ainda não tem animais cadastrados. Você pode trabalhar nesta ficha normalmente,
              mas ao final lembre-se de cadastrar o equino em <strong>Animais</strong> e vincular
              esta ficha.
            </div>
          )}

          <EquineOdontogram teeth={teethMap} onSelect={setSelectedTooth} selected={selectedTooth} />

          <OdoNotes odoId={odoId} initial={currentOdo?.notes ?? ""} />

          <ToothSummary teeth={teeth} onPick={setSelectedTooth} />
        </motion.div>
      )}

      <ToothDialog
        toothNumber={selectedTooth}
        existing={selectedTooth ? (teethMap[selectedTooth] as ToothRow | undefined) : undefined}
        onClose={() => setSelectedTooth(null)}
        onSave={async (patch) => {
          if (selectedTooth == null) return;
          await upsertTooth(selectedTooth, patch);
          setSelectedTooth(null);
          toast.success(`Dente ${selectedTooth} atualizado`);
        }}
      />

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular ficha a um paciente</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Selecione o animal</Label>
            <Select onValueChange={(v) => linkPet(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Buscar…" />
              </SelectTrigger>
              <SelectContent>
                {pets.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {p.breed ? `· ${p.breed}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateWithPet({ pets, onCreate }: { pets: Pet[]; onCreate: (petId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState("");
  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-gradient-primary">
        <Plus className="mr-1 h-4 w-4" /> Nova ficha
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova ficha odontológica</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Paciente</Label>
            <Select value={val} onValueChange={setVal}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione…" />
              </SelectTrigger>
              <SelectContent>
                {pets.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {p.breed ? `· ${p.breed}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!val}
              onClick={() => {
                onCreate(val);
                setOpen(false);
                setVal("");
              }}
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function OdoNotes({ odoId, initial }: { odoId: string; initial: string }) {
  const col = useRxCollection("odontograms");
  const [val, setVal] = useState(initial);
  useEffect(() => setVal(initial), [initial, odoId]);
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <Label className="text-xs">Notas gerais da ficha</Label>
      <Textarea rows={2} value={val} onChange={(e) => setVal(e.target.value)} className="mt-1" />
      <div className="mt-2 flex justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            if (!col) return;
            const doc = await col.findOne(odoId).exec();
            if (doc)
              await doc.incrementalPatch({ notes: val, updated_at: new Date().toISOString() });
            toast.success("Notas salvas");
          }}
        >
          <Save className="mr-1 h-3.5 w-3.5" />
          Salvar notas
        </Button>
      </div>
    </div>
  );
}

function ToothSummary({ teeth, onPick }: { teeth: ToothRow[]; onPick: (n: number) => void }) {
  const rows = teeth
    .filter((t) => t.status !== "sadio" || t.procedure || t.notes || (t.images?.length ?? 0) > 0)
    .sort((a, b) => a.tooth_number - b.tooth_number);
  if (!rows.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <h3 className="mb-2 text-sm font-medium">Histórico desta ficha</h3>
      <ul className="grid gap-1.5 md:grid-cols-2">
        {rows.map((t) => (
          <li
            key={t.id}
            onClick={() => onPick(t.tooth_number)}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background/40 px-2 py-1.5 text-xs hover:bg-accent"
          >
            <Badge variant="outline" className="font-mono">
              {t.tooth_number}
            </Badge>
            <span className="font-medium">{STATUS_LABEL[t.status] ?? t.status}</span>
            {t.procedure && <span className="text-muted-foreground">• {t.procedure}</span>}
            {(t.images?.length ?? 0) > 0 && (
              <Badge variant="secondary" className="ml-auto text-[10px]">
                {t.images?.length} foto(s)
              </Badge>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ToothDialog({
  toothNumber,
  existing,
  onClose,
  onSave,
}: {
  toothNumber: number | null;
  existing?: ToothRow;
  onClose: () => void;
  onSave: (patch: Partial<ToothRow>) => Promise<void>;
}) {
  const [status, setStatus] = useState<ToothStatus>("sadio");
  const [procedure, setProcedure] = useState("");
  const [notes, setNotes] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus((existing?.status ?? "sadio") as ToothStatus);
    setProcedure(existing?.procedure ?? "");
    setNotes(existing?.notes ?? "");
    setImages((existing?.images ?? []) as string[]);
  }, [toothNumber, existing]);

  const open = toothNumber !== null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Dente {toothNumber}{" "}
            <span className="ml-2 text-xs font-normal text-muted-foreground">Triadan</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ToothStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABEL) as ToothStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Procedimento</Label>
            <Input
              value={procedure}
              onChange={(e) => setProcedure(e.target.value)}
              placeholder="Extração, desgaste, limpeza, correção..."
            />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div>
            <Label>Fotos do procedimento</Label>
            <ImageUpload value={images} onChange={setImages} folder="odontogram" label="" max={6} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={saving}
            className="bg-gradient-primary"
            onClick={async () => {
              setSaving(true);
              await onSave({ status, procedure: procedure || null, notes: notes || null, images });
              setSaving(false);
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
