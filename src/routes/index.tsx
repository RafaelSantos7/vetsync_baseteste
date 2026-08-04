import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
// Execute esta instrucao no projeto: Abra o Formulário seguro de Secrets para eu inserir os valores.
//
// Não coloque nenhum segredo no frontend, no .env público ou em variável VITE_.
//
// Quero cadastrar com segurança:
//
// GOOGLE_CLIENT_ID
// GOOGLE_CLIENT_SECRET
// GOOGLE_REDIRECT_URI
// APP_URL
//
// Antes de abrir o formulário, mostre também a URL exata da Edge Function google-oauth-callback que devo cadastrar no Google Cloud como URI de redirecionamento.
//
// Depois que eu inserir os valores, continue a configuração e confirme se:
// - as Secrets foram salvas;
// - as Edge Functions estão publicadas;
// - o callback está correto;
// - o Client Secret antigo pode ser revogado.
import { motion } from "framer-motion";
import { ArrowRight, Stethoscope, WifiOff, Activity, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { LegalFooter } from "@/components/legal-layout";


export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/dashboard" />;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* glow background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[360px] rounded-full bg-accent/30 blur-3xl" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Stethoscope className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-semibold">VetSystem</span>
        </div>
        <Link to="/login" className="rounded-lg border border-border bg-card/60 px-4 py-2 text-sm font-medium backdrop-blur hover:bg-card">
          Entrar
        </Link>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 pt-16 pb-24 text-center md:pt-24">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Odontologia equina · Clínica · Rural
          </span>
          <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] md:text-7xl">
            O prontuário <span className="bg-gradient-primary bg-clip-text text-transparent">veterinário</span><br/>que funciona até na fazenda.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
            Atendimentos urbanos, rurais e odontograma equino interativo. Tudo online, offline e sincronizado automaticamente.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/login" className="group inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90">
              Começar agora <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-20 grid gap-4 md:grid-cols-3"
        >
          {[
            { icon: WifiOff, title: "Offline real", desc: "IndexedDB + fila de sincronização. Funciona em áreas sem internet." },
            { icon: Activity, title: "Odontograma equino", desc: "SVG interativo com sistema Triadan e histórico evolutivo." },
            { icon: ShieldCheck, title: "Seguro & LGPD", desc: "Cada veterinário só acessa seus próprios pacientes." },
          ].map((f) => (
            <div key={f.title} className="glass rounded-xl p-5 text-left shadow-elegant">
              <f.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </motion.div>
      </main>

      <LegalFooter />
    </div>

  );
}
