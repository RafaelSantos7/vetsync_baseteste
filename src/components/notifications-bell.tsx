import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Bell, Syringe, Calendar, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Vacc = { id: string; name: string; next_due: string | null; pet_id: string };
type Appt = { id: string; title: string; scheduled_at: string; category: string };

export function NotificationsBell() {
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ["notifications"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const now = new Date();
      const in7 = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);
      const today = now.toISOString().slice(0, 10);

      const [vaccRes, apptRes] = await Promise.all([
        supabase.from("vaccines").select("id,name,next_due,pet_id")
          .not("next_due", "is", null).lte("next_due", in7).order("next_due"),
        supabase.from("appointments").select("id,title,scheduled_at,category")
          .gte("scheduled_at", now.toISOString())
          .lte("scheduled_at", new Date(now.getTime() + 2 * 86400000).toISOString())
          .order("scheduled_at"),
      ]);

      const vaccines = (vaccRes.data ?? []) as Vacc[];
      const overdue = vaccines.filter((v) => v.next_due && v.next_due < today);
      const upcoming = vaccines.filter((v) => v.next_due && v.next_due >= today);
      return {
        overdue, upcoming,
        appts: (apptRes.data ?? []) as Appt[],
      };
    },
  });

  const total = (data?.overdue.length ?? 0) + (data?.upcoming.length ?? 0) + (data?.appts.length ?? 0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <Bell className="h-4 w-4" />
          {total > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {total > 9 ? "9+" : total}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border p-3">
          <h4 className="font-medium">Notificações</h4>
          <p className="text-xs text-muted-foreground">{total === 0 ? "Tudo em dia" : `${total} pendente(s)`}</p>
        </div>
        <div className="max-h-96 divide-y divide-border overflow-y-auto">
          {data?.overdue.map((v) => (
            <button key={v.id} onClick={() => navigate({ to: "/vacinas" })}
              className="flex w-full items-start gap-2 p-3 text-left hover:bg-accent">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">Vacina vencida: {v.name}</div>
                <div className="text-xs text-muted-foreground">
                  Venceu em {new Date(v.next_due!).toLocaleDateString("pt-BR")}
                </div>
              </div>
              <Badge variant="destructive" className="text-[10px]">!</Badge>
            </button>
          ))}
          {data?.upcoming.map((v) => (
            <button key={v.id} onClick={() => navigate({ to: "/vacinas" })}
              className="flex w-full items-start gap-2 p-3 text-left hover:bg-accent">
              <Syringe className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{v.name}</div>
                <div className="text-xs text-muted-foreground">
                  Próxima dose: {new Date(v.next_due!).toLocaleDateString("pt-BR")}
                </div>
              </div>
            </button>
          ))}
          {data?.appts.map((a) => (
            <button key={a.id} onClick={() => navigate({ to: "/agenda" })}
              className="flex w-full items-start gap-2 p-3 text-left hover:bg-accent">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{a.title}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(a.scheduled_at).toLocaleString("pt-BR", { weekday: "short", hour: "2-digit", minute: "2-digit" })} • {a.category}
                </div>
              </div>
            </button>
          ))}
          {total === 0 && (
            <div className="p-6 text-center text-xs text-muted-foreground">Sem alertas para os próximos dias 🎉</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
