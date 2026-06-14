import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  PawPrint,
  Calendar,
  Syringe,
  Tractor,
  Stethoscope,
  DollarSign,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const main = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Agenda", url: "/agenda", icon: Calendar },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Animais", url: "/animais", icon: PawPrint },
];

const clinico = [
  { title: "Prontuários", url: "/prontuarios", icon: Stethoscope },
  { title: "Vacinas", url: "/vacinas", icon: Syringe },
  { title: "Odontograma Equino", url: "/odontograma", icon: PawPrint },
];

const operacional = [
  { title: "Visitas Rurais", url: "/rural", icon: Tractor },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string) => path === url || path.startsWith(url + "/");

  const Section = ({ label, items }: { label: string; items: typeof main }) => (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((it) => (
            <SidebarMenuItem key={it.url}>
              <SidebarMenuButton asChild isActive={isActive(it.url)}>
                <Link to={it.url} className="flex items-center gap-2.5">
                  <it.icon className="h-4 w-4" />
                  <span>{it.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Stethoscope className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-sm font-semibold">VetSystem</span>
            <span className="text-[10px] text-muted-foreground">Clínica & Rural</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <Section label="Principal" items={main} />
        <Section label="Clínico" items={clinico} />
        <Section label="Operacional" items={operacional} />
      </SidebarContent>
    </Sidebar>
  );
}
