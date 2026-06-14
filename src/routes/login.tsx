import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Stethoscope, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/dashboard" />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Conta criada!", { description: "Você já pode entrar." });
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error("Erro", { description: err instanceof Error ? err.message : "Tente novamente." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass relative z-10 w-full max-w-md rounded-2xl p-8 shadow-elegant"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Stethoscope className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-semibold">
            {mode === "login" ? "Entre na sua clínica" : "Crie sua conta"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login" ? "Acesse seus prontuários" : "Comece em menos de um minuto"}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pwd">Senha</Label>
            <Input id="pwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </div>

          <Button type="submit" disabled={busy} className="h-11 w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "login" ? "Entrar" : "Criar conta"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "login" ? "Ainda não tem conta?" : "Já tem conta?"}{" "}
          <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="font-medium text-primary hover:underline">
            {mode === "login" ? "Cadastre-se" : "Entrar"}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
