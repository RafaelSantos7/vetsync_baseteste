import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import {
  Users, PawPrint, Tractor, Calendar, Syringe, Stethoscope, DollarSign,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

type Hit =
  | { kind: "client"; id: string; label: string; sub: string }
  | { kind: "pet"; id: string; label: string; sub: string }
  | { kind: "property"; id: string; label: string; sub: string };

export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      if (q.trim().length < 1) { setHits([]); return; }
      const like = `%${q}%`;
      const [c, p, pr] = await Promise.all([
        supabase.from("clients").select("id,name,city").ilike("name", like).limit(6),
        supabase.from("pets").select("id,name,species,breed").ilike("name", like).limit(6),
        sb.from("properties").select("id,name,city").ilike("name", like).limit(6),
      ]);
      const out: Hit[] = [
        ...((c.data ?? []) as { id: string; name: string; city: string | null }[])
          .map((r) => ({ kind: "client" as const, id: r.id, label: r.name, sub: r.city ?? "Cliente" })),
        ...((p.data ?? []) as { id: string; name: string; species: string | null; breed: string | null }[])
          .map((r) => ({ kind: "pet" as const, id: r.id, label: r.name, sub: [r.species, r.breed].filter(Boolean).join(" • ") || "Animal" })),
        ...((pr.data ?? []) as { id: string; name: string; city: string | null }[])
          .map((r) => ({ kind: "property" as const, id: r.id, label: r.name, sub: r.city ?? "Propriedade" })),
      ];
      setHits(out);
    }, 180);
    return () => clearTimeout(t);
  }, [q, open]);

  const go = (path: string) => { onOpenChange(false); setQ(""); navigate({ to: path }); };

  const ICONS = { client: Users, pet: PawPrint, property: Tractor } as const;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput value={q} onValueChange={setQ} placeholder="Buscar clientes, animais, propriedades..." />
      <CommandList>
        <CommandEmpty>Nada encontrado</CommandEmpty>
        {hits.length > 0 && (
          <CommandGroup heading="Resultados">
            {hits.map((h) => {
              const Icon = ICONS[h.kind];
              const path =
                h.kind === "client" ? "/clientes" :
                h.kind === "pet" ? "/animais" : "/rural";
              return (
                <CommandItem key={`${h.kind}-${h.id}`} onSelect={() => go(path)}>
                  <Icon className="mr-2 h-4 w-4 text-primary" />
                  <span className="flex-1">{h.label}</span>
                  <span className="text-xs text-muted-foreground">{h.sub}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
        <CommandSeparator />
        <CommandGroup heading="Ir para">
          <CommandItem onSelect={() => go("/agenda")}><Calendar className="mr-2 h-4 w-4" />Agenda</CommandItem>
          <CommandItem onSelect={() => go("/prontuarios")}><Stethoscope className="mr-2 h-4 w-4" />Prontuários</CommandItem>
          <CommandItem onSelect={() => go("/vacinas")}><Syringe className="mr-2 h-4 w-4" />Vacinas</CommandItem>
          <CommandItem onSelect={() => go("/odontograma")}><PawPrint className="mr-2 h-4 w-4" />Odontograma</CommandItem>
          <CommandItem onSelect={() => go("/rural")}><Tractor className="mr-2 h-4 w-4" />Visitas Rurais</CommandItem>
          <CommandItem onSelect={() => go("/financeiro")}><DollarSign className="mr-2 h-4 w-4" />Financeiro</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
