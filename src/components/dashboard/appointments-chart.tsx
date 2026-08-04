import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export type ApptLike = { id: string; title?: string; category?: string | null; scheduled_at: string };

type PeriodMode = "14d" | "30d" | "month" | "nextMonth" | "custom";

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** Local (não-UTC) chave de dia: YYYY-MM-DD */
export function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function addDays(d: Date, n: number) { const x = startOfDay(d); x.setDate(x.getDate() + n); return x; }
function diffDays(a: Date, b: Date) { return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000); }

export function AppointmentsChart({ appointments }: { appointments: ApptLike[] }) {
  const [mode, setMode] = useState<PeriodMode>("14d");
  const [anchor, setAnchor] = useState<Date>(() => startOfDay(new Date()));
  const [customFrom, setCustomFrom] = useState(() => dayKey(addDays(new Date(), -7)));
  const [customTo, setCustomTo] = useState(() => dayKey(addDays(new Date(), 7)));
  const scroller = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ id: number; x: number; left: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [scrollState, setScrollState] = useState({ left: 0, max: 0, ratio: 0, visible: 0 });


  const syncScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const max = Math.max(el.scrollWidth - el.clientWidth, 0);
    setScrollState({
      left: el.scrollLeft,
      max,
      ratio: max > 0 ? el.scrollLeft / max : 0,
      visible: el.scrollWidth > 0 ? el.clientWidth / el.scrollWidth : 1,
    });
  };


  const { from, to, title } = useMemo(() => {
    if (mode === "custom") {
      const f = startOfDay(new Date(`${customFrom}T00:00:00`));
      const t = startOfDay(new Date(`${customTo}T00:00:00`));
      return { from: f, to: t >= f ? t : f, title: "Atendimentos — período personalizado" };
    }
    if (mode === "month" || mode === "nextMonth") {
      const base = new Date(anchor.getFullYear(), anchor.getMonth() + (mode === "nextMonth" ? 1 : 0), 1);
      const last = new Date(base.getFullYear(), base.getMonth() + 1, 0);
      return { from: base, to: last, title: `Atendimentos — ${MONTHS[base.getMonth()]} de ${base.getFullYear()}` };
    }
    const span = mode === "14d" ? 14 : 30;
    return {
      from: addDays(anchor, -(span - 1)),
      to: startOfDay(anchor),
      title: `Atendimentos — ${span} dias`,
    };
  }, [mode, anchor, customFrom, customTo]);

  const days = useMemo(() => {
    const total = Math.min(diffDays(from, to) + 1, 400);
    const byDay = new Map<string, ApptLike[]>();
    for (const a of appointments) {
      if (!a?.scheduled_at) continue;
      const k = dayKey(new Date(a.scheduled_at));
      const arr = byDay.get(k);
      if (arr) arr.push(a); else byDay.set(k, [a]);
    }
    const out: { day: string; label: string; atendimentos: number; cats: [string, number][] }[] = [];
    for (let i = 0; i < total; i++) {
      const d = addDays(from, i);
      const k = dayKey(d);
      const list = byDay.get(k) ?? [];
      const catMap: Record<string, number> = {};
      list.forEach((a) => { const c = a.category || "Sem categoria"; catMap[c] = (catMap[c] ?? 0) + 1; });
      out.push({
        day: k.slice(5).split("-").reverse().join("/"),
        label: d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }),
        atendimentos: list.length,
        cats: Object.entries(catMap).sort((a, b) => b[1] - a[1]),
      });
    }
    return out;
  }, [appointments, from, to]);

  const total = days.reduce((s, d) => s + d.atendimentos, 0);
  const chartWidth = Math.max(days.length * 44, 320);

  useLayoutEffect(() => { syncScroll(); }, [days.length]);

  useEffect(() => {
    const onResize = () => syncScroll();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);


  function shift(dir: 1 | -1) {
    if (mode === "month" || mode === "nextMonth") {
      setAnchor((a) => new Date(a.getFullYear(), a.getMonth() + dir, 1));
      return;
    }
    if (mode === "custom") {
      const span = diffDays(from, to) + 1;
      setCustomFrom(dayKey(addDays(from, dir * span)));
      setCustomTo(dayKey(addDays(to, dir * span)));
      return;
    }
    const span = mode === "14d" ? 14 : 30;
    setAnchor((a) => addDays(a, dir * span));
  }

  function today() {
    setAnchor(startOfDay(new Date()));
    if (mode === "custom") {
      setCustomFrom(dayKey(addDays(new Date(), -7)));
      setCustomTo(dayKey(addDays(new Date(), 7)));
    }
    scroller.current?.scrollTo({ left: 0, behavior: "smooth" });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
      className="glass min-w-0 max-w-full overflow-hidden rounded-xl p-4 shadow-elegant sm:p-5 lg:col-span-2"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">
            {total} atendimento(s) · {from.toLocaleDateString("pt-BR")} — {to.toLocaleDateString("pt-BR")}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs text-success">
          <TrendingUp className="h-3 w-3" /> Tempo real
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shift(-1)} aria-label="Período anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" className="h-8" onClick={today}>Hoje</Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shift(1)} aria-label="Próximo período">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Select value={mode} onValueChange={(v) => setMode(v as PeriodMode)}>
          <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="14d">14 dias</SelectItem>
            <SelectItem value="30d">30 dias</SelectItem>
            <SelectItem value="month">Mês atual</SelectItem>
            <SelectItem value="nextMonth">Próximo mês</SelectItem>
            <SelectItem value="custom">Personalizado</SelectItem>
          </SelectContent>
        </Select>
        {mode === "custom" && (
          <div className="flex flex-wrap items-center gap-2">
            <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-8 w-[145px] text-xs" />
            <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-8 w-[145px] text-xs" />
          </div>
        )}
      </div>

      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-20 w-10 rounded-l-lg bg-gradient-to-r from-card to-transparent transition-opacity duration-300"
          style={{ opacity: scrollState.left > 4 ? 1 : 0 }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-20 w-10 rounded-r-lg bg-gradient-to-l from-card to-transparent transition-opacity duration-300"
          style={{ opacity: scrollState.max - scrollState.left > 4 ? 1 : 0 }}
        />
        <div
          ref={scroller}
          className={`no-scrollbar w-full max-w-full touch-pan-x overflow-x-auto overflow-y-hidden overscroll-x-contain ${dragging ? "cursor-grabbing select-none" : "cursor-grab"}`}
          onScroll={syncScroll}
          onWheel={(e) => {
            const el = scroller.current;
            if (!el) return;
            if (e.shiftKey && e.deltaY !== 0) {
              el.scrollLeft += e.deltaY;
              e.preventDefault();
            }
          }}
          onPointerDown={(e) => {
            if (e.pointerType === "mouse" && e.button !== 0) return;
            drag.current = { id: e.pointerId, x: e.clientX, left: scroller.current?.scrollLeft ?? 0, moved: false };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            const el = scroller.current;
            if (!d || !el || d.id !== e.pointerId) return;
            const dx = e.clientX - d.x;
            if (!d.moved) {
              if (Math.abs(dx) < 4) return;
              d.moved = true;
              setDragging(true);
              try { el.setPointerCapture(e.pointerId); } catch { /* noop */ }
            }
            el.scrollLeft = d.left - dx;
            e.preventDefault();
          }}
          onPointerUp={(e) => {
            const d = drag.current;
            drag.current = null;
            if (d?.moved) {
              setDragging(false);
              try { scroller.current?.releasePointerCapture(e.pointerId); } catch { /* noop */ }
            }
          }}
          onPointerCancel={() => { drag.current = null; setDragging(false); }}
          onDragStart={(e) => e.preventDefault()}
        >


        <div style={{ width: chartWidth }} className="h-64">
          <ResponsiveContainer>
            <AreaChart data={days} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.72 0.18 195)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="oklch(0.72 0.18 195)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 260)" />
              <XAxis dataKey="day" stroke="oklch(0.55 0.02 258)" fontSize={11} tickLine={false} axisLine={false} interval={0} />
              <YAxis stroke="oklch(0.55 0.02 258)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
              <Tooltip
                wrapperStyle={{ zIndex: 30 }}
                contentStyle={{ background: "oklch(0.20 0.020 255)", border: "1px solid oklch(0.28 0.02 260)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "oklch(0.85 0 0)" }}
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as (typeof days)[number];
                  return (
                    <div className="rounded-lg border border-border bg-card/95 p-2.5 text-xs shadow-lg backdrop-blur">
                      <div className="font-medium">{p.label}</div>
                      <div className="text-muted-foreground">Total: {p.atendimentos}</div>
                      {p.cats.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {p.cats.map(([c, n]) => (
                            <li key={c} className="flex justify-between gap-3"><span>{c}</span><span className="font-medium">{n}</span></li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                }}
              />
              <Area type="monotone" dataKey="atendimentos" stroke="oklch(0.72 0.18 195)" strokeWidth={2} fill="url(#g1)" />
            </AreaChart>
          </ResponsiveContainer>
          </div>
        </div>
      </div>

      {scrollState.max > 4 && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
          <div
            className="h-full rounded-full bg-gradient-primary shadow-glow transition-[margin,width] duration-200 ease-out"
            style={{
              width: `${Math.max(scrollState.visible * 100, 12)}%`,
              marginLeft: `${scrollState.ratio * (100 - Math.max(scrollState.visible * 100, 12))}%`,
            }}
          />
        </div>
      )}
      <p className="mt-1.5 text-center text-[10px] text-muted-foreground">Clique e arraste ou deslize para ver mais datas</p>

    </motion.div>
  );
}
