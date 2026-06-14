import { useCallback, useState } from "react";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export interface AttachedFile {
  path: string;
  name: string;
  size: number;
  type: string;
}

interface Props {
  value: AttachedFile[];
  onChange: (files: AttachedFile[]) => void;
  folder?: string;
}

export function FileDrop({ value, onChange, folder = "records" }: Props) {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  const upload = useCallback(async (files: File[]) => {
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sem sessão");
      const uploaded: AttachedFile[] = [];
      for (const f of files) {
        const path = `${user.id}/${folder}/${Date.now()}-${f.name}`;
        const { error } = await supabase.storage.from("vet-files").upload(path, f);
        if (error) throw error;
        uploaded.push({ path, name: f.name, size: f.size, type: f.type });
      }
      onChange([...value, ...uploaded]);
      toast.success(`${uploaded.length} arquivo(s) enviado(s)`);
    } catch (e) {
      toast.error("Falha no upload: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [folder, onChange, value]);

  return (
    <div className="space-y-2">
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragging(false);
          upload(Array.from(e.dataTransfer.files));
        }}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer ${
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
        <span className="text-sm text-muted-foreground">Arraste arquivos aqui ou clique para enviar</span>
        <input
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && upload(Array.from(e.target.files))}
        />
      </label>
      {value.length > 0 && (
        <ul className="space-y-1">
          {value.map((f) => (
            <li key={f.path} className="flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2 text-sm">
              <span className="flex items-center gap-2 truncate">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span className="truncate">{f.name}</span>
                <span className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(0)} KB</span>
              </span>
              <Button
                type="button" variant="ghost" size="icon"
                onClick={() => onChange(value.filter((x) => x.path !== f.path))}
              ><X className="h-3.5 w-3.5" /></Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
