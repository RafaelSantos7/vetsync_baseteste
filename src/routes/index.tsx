import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background text-foreground">
      <div className="max-w-2xl text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Ajustes de Permissões Aplicados
        </h1>
        
        <p className="text-lg text-muted-foreground">
          A sidebar e o acesso aos módulos foram configurados seguindo a lógica explícita de cargos.
        </p>
        
        <div className="bg-card border rounded-xl p-6 text-left space-y-4 shadow-sm">
          <div>
            <h3 className="font-semibold text-primary">Veterinário (veterinarian)</h3>
            <p className="text-sm text-muted-foreground">Acesso aos módulos clínicos (Prontuários, Vacinas, Odontograma), Financeiro e Configurações.</p>
          </div>
          
          <div className="pt-2 border-t">
            <h3 className="font-semibold">Recepção (reception)</h3>
            <p className="text-sm text-muted-foreground">Limitado ao Dashboard, Agenda, Clientes, Animais e Visitas Rurais.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button asChild size="lg" className="bg-gradient-primary">
            <Link to="/dashboard">
              Ir para o Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/auth">Fazer Login</Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground italic">
          Logs de depuração foram adicionados ao console em modo desenvolvimento. Os dados no banco foram normalizados via migration.
        </p>
      </div>
    </div>
  );
}
