import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Stethoscope } from "lucide-react";

/** Dados do responsável — fáceis de editar */
export const LEGAL_INFO = {
  company: "WebTech",
  cnpj: "57.886.651/0001-48",
  email: "contato@webtech.dev.br",
  city: "São José dos Campos - SP",
  lastUpdate: "agosto de 2026",
};

export function LegalFooter() {
  return (
    <footer className="relative z-10 border-t border-border/60 px-6 py-10 md:px-12">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 text-sm text-muted-foreground md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-display font-semibold text-foreground">VetSystem</p>
          <p className="mt-1">{LEGAL_INFO.company} · CNPJ {LEGAL_INFO.cnpj}</p>
          <p>{LEGAL_INFO.city}</p>
        </div>
        <div className="flex flex-col gap-1">
          <a href={`mailto:${LEGAL_INFO.email}`} className="hover:text-foreground">
            {LEGAL_INFO.email}
          </a>
          <Link to="/politica-de-privacidade" className="hover:text-foreground">
            Política de Privacidade
          </Link>
          <Link to="/termos" className="hover:text-foreground">
            Termos de Uso
          </Link>
        </div>
      </div>
    </footer>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-semibold md:text-2xl">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
        {children}
      </div>
    </section>
  );
}

export function LegalLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[420px] w-[720px] max-w-full -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      </div>

      <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-6 py-5 md:px-12">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Stethoscope className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-semibold">VetSystem</span>
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/60 px-4 py-2 text-sm font-medium backdrop-blur hover:bg-card"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao início
        </Link>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-6 pb-16 pt-6 md:px-8">
        <h1 className="font-display text-3xl font-bold md:text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{subtitle}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Última atualização: {LEGAL_INFO.lastUpdate}
        </p>
        {children}
      </main>

      <LegalFooter />
    </div>
  );
}
