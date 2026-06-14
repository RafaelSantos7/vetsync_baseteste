import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, TrendingUp, TrendingDown, Wallet, Search, Check, Trash2 } from "lucide-react";

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
import { toast } from "sonner";
import { useRxQuery, useRxCollection, uuid } from "@/hooks/use-rx";

export const Route = createFileRoute("/_authenticated/financeiro")({
  component: FinanceiroPage,
});

type Tx = {
  id: string;
  type: "receita" | "despesa";
  category: string | null;
  description: string;
  amount: number;
  due_date: string | null;
  paid_at: string | null;
  payment_method: string | null;
  notes: string | null;
  client_id: string | null;
};
type Client = { id: string; name: string };

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function FinanceiroPage() {
  const col = useRxCollection("financial_transactions");
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"todos" | "receita" | "despesa">("todos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tx | null>(null);

  const { data: rawTxs = [], isLoading } = useRxQuery<Tx>("financial_transactions", {
    selector: { is_deleted: { $ne: true } },
  });
  const txs = [...rawTxs].sort((a, b) => (b.due_date ?? "").localeCompare(a.due_date ?? ""));

  const { data: clients = [] } = useRxQuery<Client>("clients", {
    selector: { is_deleted: { $ne: true } },
  });

  const stats = useMemo(() => {
    const receita = txs.filter((t) => t.type === "receita");
    const despesa = txs.filter((t) => t.type === "despesa");
    const pago = receita.filter((t) => t.paid_at).reduce((a, b) => a + Number(b.amount), 0);
    const pendente = receita.filter((t) => !t.paid_at).reduce((a, b) => a + Number(b.amount), 0);
    const despTotal = despesa.reduce((a, b) => a + Number(b.amount), 0);
    return { pago, pendente, despTotal, saldo: pago - despTotal };
  }, [txs]);

  const filtered = txs.filter((t) => {
    const text = `${t.description} ${t.category ?? ""}`.toLowerCase();
    if (q && !text.includes(q.toLowerCase())) return false;
    if (typeFilter !== "todos" && t.type !== typeFilter) return false;
    return true;
  });

  const togglePaid = async (t: Tx) => {
    if (!col) return;
    const doc = await col.findOne(t.id).exec();
    if (doc)
      await doc.incrementalPatch({
        paid_at: t.paid_at ? null : new Date().toISOString().slice(0, 10),
        updated_at: new Date().toISOString(),
      });
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir lançamento?") || !col) return;
    const doc = await col.findOne(id).exec();
    if (doc) await doc.remove();
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Receitas, despesas e fluxo de caixa</p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary">
              <Plus className="mr-1 h-4 w-4" />
              Novo lançamento
            </Button>
          </DialogTrigger>
          <TxDialog
            editing={editing}
            clients={clients}
            onClose={() => {
              setOpen(false);
              setEditing(null);
            }}
          />
        </Dialog>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Recebido"
          value={fmt(stats.pago)}
          icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
          accent="from-emerald-500/20"
        />
        <StatCard
          label="A receber"
          value={fmt(stats.pendente)}
          icon={<Wallet className="h-4 w-4 text-amber-500" />}
          accent="from-amber-500/20"
        />
        <StatCard
          label="Despesas"
          value={fmt(stats.despTotal)}
          icon={<TrendingDown className="h-4 w-4 text-rose-500" />}
          accent="from-rose-500/20"
        />
        <StatCard
          label="Saldo"
          value={fmt(stats.saldo)}
          icon={<Wallet className="h-4 w-4 text-primary" />}
          accent="from-primary/30"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar descrição ou categoria..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="receita">Receitas</SelectItem>
            <SelectItem value="despesa">Despesas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Nenhum lançamento. Crie seu primeiro registro.
        </div>
      ) : (
        <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          {filtered.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card/60 p-3"
            >
              <div
                className={`h-9 w-9 shrink-0 rounded-lg grid place-items-center ${t.type === "receita" ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500"}`}
              >
                {t.type === "receita" ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{t.description}</span>
                  {t.category && (
                    <Badge variant="outline" className="text-[10px]">
                      {t.category}
                    </Badge>
                  )}
                  {t.paid_at ? (
                    <Badge className="bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20">
                      Pago
                    </Badge>
                  ) : (
                    <Badge variant="outline">Pendente</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t.due_date
                    ? `Venc.: ${new Date(t.due_date).toLocaleDateString("pt-BR")}`
                    : "Sem vencimento"}
                  {t.payment_method && ` • ${t.payment_method}`}
                </div>
              </div>
              <div
                className={`font-display text-lg font-semibold ${t.type === "receita" ? "text-emerald-500" : "text-rose-500"}`}
              >
                {t.type === "despesa" && "-"}
                {fmt(Number(t.amount))}
              </div>
              <div className="flex gap-1">
                {t.type === "receita" && (
                  <Button size="sm" variant="outline" onClick={() => togglePaid(t)}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(t);
                    setOpen(true);
                  }}
                >
                  Editar
                </Button>
                <Button size="sm" variant="outline" onClick={() => remove(t.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </motion.ul>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-border bg-card/60 p-4`}>
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent} to-transparent opacity-40`}
      />
      <div className="relative">
        <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className="font-display text-2xl font-semibold">{value}</div>
      </div>
    </div>
  );
}

function TxDialog({
  editing,
  clients,
  onClose,
}: {
  editing: Tx | null;
  clients: Client[];
  onClose: () => void;
}) {
  const col = useRxCollection("financial_transactions");
  const [form, setForm] = useState<Partial<Tx>>(
    editing ?? {
      type: "receita",
      description: "",
      amount: 0,
      category: "Consulta",
      due_date: new Date().toISOString().slice(0, 10),
    },
  );
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.description) {
      toast.error("Descrição obrigatória");
      return;
    }
    if (!col) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        type: form.type ?? "receita",
        description: form.description,
        amount: Number(form.amount ?? 0),
        category: form.category || null,
        due_date: form.due_date || null,
        paid_at: form.paid_at || null,
        payment_method: form.payment_method || null,
        client_id: form.client_id || null,
        notes: form.notes || null,
        updated_at: now,
      };
      if (editing) {
        const doc = await col.findOne(editing.id).exec();
        if (doc) await doc.incrementalPatch(payload);
      } else {
        await col.insert({ id: uuid(), ...payload, is_deleted: false, created_at: now });
      }
      toast.success("Lançamento salvo");
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
        <DialogTitle>{editing ? "Editar" : "Novo"} lançamento</DialogTitle>
      </DialogHeader>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>Tipo</Label>
          <Select
            value={form.type}
            onValueChange={(v) => setForm({ ...form, type: v as Tx["type"] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="receita">Receita</SelectItem>
              <SelectItem value="despesa">Despesa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Valor (R$)</Label>
          <Input
            type="number"
            step="0.01"
            value={form.amount ?? 0}
            onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
          />
        </div>
        <div className="md:col-span-2">
          <Label>Descrição</Label>
          <Input
            value={form.description ?? ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Consulta — Rex"
          />
        </div>
        <div>
          <Label>Categoria</Label>
          <Input
            value={form.category ?? ""}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder="Consulta, Vacina, Cirurgia..."
          />
        </div>
        <div>
          <Label>Vencimento</Label>
          <Input
            type="date"
            value={form.due_date ?? ""}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
          />
        </div>
        <div>
          <Label>Pagamento</Label>
          <Select
            value={form.payment_method ?? ""}
            onValueChange={(v) => setForm({ ...form, payment_method: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Pix">Pix</SelectItem>
              <SelectItem value="Dinheiro">Dinheiro</SelectItem>
              <SelectItem value="Cartão">Cartão</SelectItem>
              <SelectItem value="Boleto">Boleto</SelectItem>
              <SelectItem value="Transferência">Transferência</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Cliente</Label>
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
          <Label>Observações</Label>
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
