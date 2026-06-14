import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Calendar, PawPrint, Users, Syringe, TrendingUp, DollarSign,
  Tractor, AlertTriangle, ArrowRight,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase, sb } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const CAT_COLORS = ["oklch(0.72 0.18 195)", "oklch(0.65 0.22 25)", "oklch(0.78 0.16 145)", "oklch(0.68 0.18 285)", "oklch(0.75 0.18 80)"];

type StatCardProps = {
  label: string; value: string | number; hint: string;
  icon: React.ComponentType<{ className?: string }>; delay?: number; to?: string;
};

function StatCard({ label, value, hint, icon: Icon, delay = 0, to }: StatCardProps) {
  const body = (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="glass group relative overflow-hidden rounded-xl p-5 shadow-elegant transition hover:border-primary/40"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 font-display text-3xl font-semibold">{value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="pointer-events-none absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
    </motion.div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-v2"],
    queryFn: async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const fourteenAgo = new Date(now.getTime() - 13 * 86400000); fourteenAgo.setHours(0, 0, 0, 0);
      const today = now.toISOString().slice(0, 10);

      const [petsC, clientsC, propsC, apptsAll, vaccs, txs] = await Promise.all([
        supabase.from("pets").select("*", { count: "exact", head: true }),
        supabase.from("clients").select("*", { count: "exact", head: true }),
        sb.from("properties").select("*", { count: "exact", head: true }),
        supabase.from("appointments").select("id,scheduled_at,category,title")
          .gte("scheduled_at", fourteenAgo.toISOString()),
        supabase.from("vaccines").select("id,next_due").not("next_due", "is", null),
        sb.from("financial_transactions").select("type,amount,paid_at,due_date")
          .gte("due_date", monthStart),
      ]);

      const appts = (apptsAll.data ?? []) as { id: string; scheduled_at: string; category: string; title: string }[];

      // 14-day timeline
      const days: { day: string; atendimentos: number; label: string }[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000); d.setHours(0, 0, 0, 0);
        const key = d.toISOString().slice(0, 10);
        const count = appts.filter((a) => a.scheduled_at.slice(0, 10) === key).length;
        days.push({ day: key.slice(5), atendimentos: count, label: d.toLocaleDateString("pt-BR") });
      }

      // Category distribution
      const catMap: Record<string, number> = {};
      appts.forEach((a) => { catMap[a.category] = (catMap[a.category] ?? 0) + 1; });
      const categories = Object.entries(catMap).map(([name, v]) => ({ name, v }));

      // Vaccine alerts
      const vList = (vaccs.data ?? []) as { id: string; next_due: string }[];
      const overdue = vList.filter((v) => v.next_due < today).length;
      const upcoming7 = vList.filter((v) => {
        const d = new Date(v.next_due);
        const diff = (d.getTime() - now.getTime()) / 86400000;
        return diff >= 0 && diff <= 7;
      }).length;

      // Financial month
      const txList = (txs.data ?? []) as { type: string; amount: number; paid_at: string | null }[];
      const receita = txList.filter((t) => t.type === "receita");
      const recebido = receita.filter((t) => t.paid_at).reduce((a, b) => a + Number(b.amount), 0);
      const aReceber = receita.filter((t) => !t.paid_at).reduce((a, b) => a + Number(b.amount), 0);
      const despesa = txList.filter((t) => t.type === "despesa").reduce((a, b) => a + Number(b.amount), 0);

      // Next appointments
      const nextAppts = appts
        .filter((a) => new Date(a.scheduled_at) >= now)
        .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
        .slice(0, 5);

      return {
        counts: {
          pets: petsC.count ?? 0, clients: clientsC.count ?? 0,
          props: propsC.count ?? 0, appts: appts.length,
        },
        days, categories, overdue, upcoming7,
        fin: { recebido, aReceber, despesa, saldo: recebido - despesa },
        nextAppts,
      };
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-semibold md:text-3xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral em tempo real da sua clínica.</p>
        </div>
        {(data?.overdue ?? 0) > 0 && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {data?.overdue} vacina(s) vencida(s)
          </Badge>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
        ) : (
          <>
            <StatCard label="Atendimentos (14d)" value={data!.counts.appts} hint="Período recente" icon={Calendar} to="/agenda" delay={0.05} />
            <StatCard label="Animais" value={data!.counts.pets} hint="Pacientes" icon={PawPrint} to="/animais" delay={0.1} />
            <StatCard label="Clientes" value={data!.counts.clients} hint="Tutores" icon={Users} to="/clientes" delay={0.15} />
            <StatCard label="Propriedades" value={data!.counts.props} hint="Rural" icon={Tractor} to="/rural" delay={0.2} />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="glass rounded-xl p-5 shadow-elegant lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Atendimentos · 14 dias</h3>
              <p className="text-xs text-muted-foreground">Evolução de agendamentos</p>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs text-success">
              <TrendingUp className="h-3 w-3" /> Tempo real
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={data?.days ?? []}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.72 0.18 195)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="oklch(0.72 0.18 195)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 260)" />
                <XAxis dataKey="day" stroke="oklch(0.55 0.02 258)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.55 0.02 258)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "oklch(0.20 0.020 255)", border: "1px solid oklch(0.28 0.02 260)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "oklch(0.85 0 0)" }}
                />
                <Area type="monotone" dataKey="atendimentos" stroke="oklch(0.72 0.18 195)" strokeWidth={2} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="glass rounded-xl p-5 shadow-elegant">
          <h3 className="font-semibold">Por categoria</h3>
          <p className="mb-4 text-xs text-muted-foreground">Últimos 14 dias</p>
          <div className="h-64">
            {(data?.categories.length ?? 0) === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sem dados</div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data?.categories} dataKey="v" nameKey="name" innerRadius={42} outerRadius={80} paddingAngle={3}>
                    {data?.categories.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "oklch(0.20 0.020 255)", border: "1px solid oklch(0.28 0.02 260)", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          className="glass rounded-xl p-5 shadow-elegant lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Próximos atendimentos</h3>
            <Link to="/agenda" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              Ver agenda <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {(data?.nextAppts.length ?? 0) === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum agendamento futuro</p>
          ) : (
            <ul className="divide-y divide-border">
              {data?.nextAppts.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{a.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(a.scheduled_at).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{a.category}</Badge>
                </li>
              ))}
            </ul>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="glass rounded-xl p-5 shadow-elegant">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Financeiro do mês</h3>
            <DollarSign className="h-4 w-4 text-success" />
          </div>
          <div className="mt-3 font-display text-3xl font-semibold text-success">{fmt(data?.fin.recebido ?? 0)}</div>
          <p className="text-xs text-muted-foreground">Recebido</p>
          <div className="mt-4 space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">A receber</span><span className="font-medium text-amber-500">{fmt(data?.fin.aReceber ?? 0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Despesas</span><span className="font-medium text-rose-500">{fmt(data?.fin.despesa ?? 0)}</span></div>
            <div className="flex justify-between border-t border-border pt-1.5"><span>Saldo</span><span className="font-semibold">{fmt(data?.fin.saldo ?? 0)}</span></div>
          </div>
          <Link to="/financeiro" className="mt-4 inline-flex items-center gap-1 text-xs text-primary hover:underline">
            Ver financeiro <ArrowRight className="h-3 w-3" />
          </Link>
        </motion.div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
          className="glass rounded-xl p-5 shadow-elegant">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-amber-500/15 text-amber-500"><Syringe className="h-5 w-5" /></div>
            <div className="flex-1">
              <h3 className="font-semibold">Vacinas — próximos 7 dias</h3>
              <p className="text-2xl font-display font-semibold">{data?.upcoming7 ?? 0}</p>
              <p className="text-xs text-muted-foreground">Doses programadas</p>
            </div>
            <Link to="/vacinas" className="text-xs text-primary hover:underline">Abrir</Link>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="glass rounded-xl p-5 shadow-elegant">
          <h3 className="mb-2 font-semibold">Volume por categoria</h3>
          <div className="h-32">
            <ResponsiveContainer>
              <BarChart data={data?.categories ?? []}>
                <XAxis dataKey="name" stroke="oklch(0.55 0.02 258)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "oklch(0.20 0.020 255)", border: "1px solid oklch(0.28 0.02 260)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="v" radius={[6, 6, 0, 0]}>
                  {(data?.categories ?? []).map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
