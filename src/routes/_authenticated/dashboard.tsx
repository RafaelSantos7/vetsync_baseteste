import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Calendar, PawPrint, Users, Syringe, DollarSign,
  Tractor, AlertTriangle, ArrowRight,
} from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, Cell } from "recharts";
import { useRxQuery } from "@/hooks/use-rx";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AppointmentsChart } from "@/components/dashboard/appointments-chart";
import { CategoryChart } from "@/components/dashboard/category-chart";
import { useRxDB } from "@/lib/rxdb/provider";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

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
  const { organizationId } = useAuth();
  const { initialSyncDone } = useRxDB();

  const orgSel = { is_deleted: { $ne: true }, organization_id: { $eq: organizationId } } as any;

  const { data: pets = [], isLoading: loadingPets } = useRxQuery("pets", { selector: orgSel }, [organizationId, initialSyncDone]);
  const { data: clients = [], isLoading: loadingClients } = useRxQuery("clients", { selector: orgSel }, [organizationId, initialSyncDone]);
  const { data: properties = [], isLoading: loadingProps } = useRxQuery("properties", { selector: orgSel }, [organizationId, initialSyncDone]);
  const { data: appointments = [], isLoading: loadingAppts } = useRxQuery<any>("appointments", { selector: orgSel }, [organizationId, initialSyncDone]);
  const { data: vaccines = [] } = useRxQuery("vaccines", { selector: orgSel }, [organizationId, initialSyncDone]);
  const { data: transactions = [] } = useRxQuery("financial_transactions", { selector: orgSel }, [organizationId, initialSyncDone]);

  const isLoading = !initialSyncDone || loadingPets || loadingClients || loadingProps || loadingAppts;

  const stats = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Categorias do mês atual (para o gráfico de volume)
    const monthApptStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthAppts = appointments.filter((a: any) => new Date(a.scheduled_at) >= monthApptStart);
    const catMap: Record<string, number> = {};
    monthAppts.forEach((a: any) => { const c = a.category || "Sem categoria"; catMap[c] = (catMap[c] ?? 0) + 1; });
    const categories = Object.entries(catMap).map(([name, v]) => ({ name, v }));


    // Vaccine alerts
    const overdue = vaccines.filter((v: any) => v.next_due && v.next_due < today).length;
    const upcoming7 = vaccines.filter((v: any) => {
      if (!v.next_due) return false;
      const d = new Date(v.next_due);
      const diff = (d.getTime() - now.getTime()) / 86400000;
      return diff >= 0 && diff <= 7;
    }).length;

    // Financial month
    const monthTxs = transactions.filter((t: any) => t.due_date >= monthStart || (t.paid_at && t.paid_at >= monthStart));
    const receita = monthTxs.filter((t: any) => t.type === "receita");
    const recebido = receita.filter((t: any) => t.paid_at).reduce((a: number, b: any) => a + Number(b.amount), 0);
    const aReceber = receita.filter((t: any) => !t.paid_at).reduce((a: number, b: any) => a + Number(b.amount), 0);
    const despesa = monthTxs.filter((t: any) => t.type === "despesa").reduce((a: number, b: any) => a + Number(b.amount), 0);

    // Next appointments
    const nextAppts = appointments
      .filter((a: any) => new Date(a.scheduled_at) >= now)
      .sort((a: any, b: any) => a.scheduled_at.localeCompare(b.scheduled_at))
      .slice(0, 5);

    return {
      counts: {
        pets: pets.length,
        clients: clients.length,
        props: properties.length,
        appts: monthAppts.length,
      },

      categories,
      overdue,
      upcoming7,
      fin: { recebido, aReceber, despesa, saldo: recebido - despesa },
      nextAppts,
    };
  }, [pets, clients, properties, appointments, vaccines, transactions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-semibold md:text-3xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral em tempo real da sua clínica.</p>
        </div>
        {stats.overdue > 0 && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {stats.overdue} vacina(s) vencida(s)
          </Badge>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
        ) : (
          <>
            <StatCard label="Atendimentos (mês)" value={stats.counts.appts} hint="Mês atual" icon={Calendar} to="/agenda" delay={0.05} />
            <StatCard label="Animais" value={stats.counts.pets} hint="Pacientes" icon={PawPrint} to="/animais" delay={0.1} />
            <StatCard label="Clientes" value={stats.counts.clients} hint="Tutores" icon={Users} to="/clientes" delay={0.15} />
            <StatCard label="Propriedades" value={stats.counts.props} hint="Rural" icon={Tractor} to="/rural" delay={0.2} />
          </>
        )}
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <AppointmentsChart appointments={appointments as any} />
        <CategoryChart appointments={appointments as any} />
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
          {stats.nextAppts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum agendamento futuro</p>
          ) : (
            <ul className="divide-y divide-border">
              {stats.nextAppts.map((a: any) => (
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
          <div className="mt-3 font-display text-3xl font-semibold text-success">{fmt(stats.fin.recebido)}</div>
          <p className="text-xs text-muted-foreground">Recebido</p>
          <div className="mt-4 space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">A receber</span><span className="font-medium text-amber-500">{fmt(stats.fin.aReceber)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Despesas</span><span className="font-medium text-rose-500">{fmt(stats.fin.despesa)}</span></div>
            <div className="flex justify-between border-t border-border pt-1.5"><span>Saldo</span><span className="font-semibold">{fmt(stats.fin.saldo)}</span></div>
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
              <p className="text-2xl font-display font-semibold">{stats.upcoming7}</p>
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
              <BarChart data={stats.categories}>
                <XAxis dataKey="name" stroke="oklch(0.55 0.02 258)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "oklch(0.20 0.020 255)", border: "1px solid oklch(0.28 0.02 260)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="v" radius={[6, 6, 0, 0]}>
                  {stats.categories.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
