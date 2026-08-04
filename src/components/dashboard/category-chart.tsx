import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { ApptLike } from "./appointments-chart";
import { dayKey } from "./appointments-chart";

const CAT_COLORS = ["oklch(0.72 0.18 195)", "oklch(0.65 0.22 25)", "oklch(0.78 0.16 145)", "oklch(0.68 0.18 285)", "oklch(0.75 0.18 80)"];

type CatMode = "thisMonth" | "lastMonth" | "thisYear" | "all" | "custom";

const LABELS: Record<CatMode, string> = {
  thisMonth: "Este mês",
  lastMonth: "Mês anterior",
  thisYear: "Este ano",
  all: "Geral",
  custom: "Personalizado",
};

export function CategoryChart({ appointments }: { appointments: ApptLike[] }) {
  const [mode, setMode] = useState<CatMode>("thisMonth");
  const now = new Date();
  const [from, setFrom] = useState(() => dayKey(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(() => dayKey(now));

  const { data, total } = useMemo(() => {
    const n = new Date();
    let start: Date | null = null;
    let end: Date | null = null;
    if (mode === "thisMonth") {
      start = new Date(n.getFullYear(), n.getMonth(), 1);
      end = new Date(n.getFullYear(), n.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (mode === "lastMonth") {
      start = new Date(n.getFullYear(), n.getMonth() - 1, 1);
      end = new Date(n.getFullYear(), n.getMonth(), 0, 23, 59, 59, 999);
    } else if (mode === "thisYear") {
      start = new Date(n.getFullYear(), 0, 1);
      end = new Date(n.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (mode === "custom") {
      start = new Date(`${from}T00:00:00`);
      end = new Date(`${to}T23:59:59`);
    }

    const map: Record<string, number> = {};
    let t = 0;
    for (const a of appointments) {
      if (!a?.scheduled_at) continue;
      const d = new Date(a.scheduled_at);
      if (start && d < start) continue;
      if (end && d > end) continue;
      const c = a.category || "Sem categoria";
      map[c] = (map[c] ?? 0) + 1;
      t++;
    }
    return {
      data: Object.entries(map).map(([name, v]) => ({ name, v })).sort((a, b) => b.v - a.v),
      total: t,
    };
  }, [appointments, mode, from, to]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
      className="glass min-w-0 max-w-full overflow-hidden rounded-xl p-4 shadow-elegant sm:p-5"
    >
      <h3 className="font-semibold">Por categoria</h3>
      <p className="mb-3 text-xs text-muted-foreground">{LABELS[mode]}</p>

      <div className="mb-3 space-y-2">
        <Select value={mode} onValueChange={(v) => setMode(v as CatMode)}>
          <SelectTrigger className="h-8 w-full text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(LABELS) as CatMode[]).map((k) => (
              <SelectItem key={k} value={k}>{LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {mode === "custom" && (
          <div className="flex flex-wrap gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 flex-1 text-xs" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 flex-1 text-xs" />
          </div>
        )}
      </div>

      <div className="relative h-64 w-full max-w-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sem dados no período</div>
        ) : (
          <>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data} dataKey="v" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={3}>
                  {data.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip
                  wrapperStyle={{ zIndex: 30 }}
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as { name: string; v: number };
                    const pct = total ? Math.round((p.v / total) * 100) : 0;
                    return (
                      <div className="rounded-lg border border-border bg-card/95 p-2.5 text-xs shadow-lg backdrop-blur">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-muted-foreground">{p.v} atendimento(s) · {pct}%</div>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-x-0 top-[92px] text-center">
              <div className="font-display text-2xl font-semibold">{total}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">total</div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
