import { useCallback, useEffect, useState } from "react";
import { ImagePlus, X, Loader2, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  value: string[];
  onChange: (urls: string[]) => void;
  folder?: string;
  max?: number;
  label?: string;
}

/**
 * Multi-image uploader with thumbnails. Stores public signed paths
 * in the `vet-files` bucket and returns the storage path strings.
 */
export function ImageUpload({ value, onChange, folder = "pets", max = 8, label = "Fotos" }: Props) {
  const [busy, setBusy] = useState(false);

  const upload = useCallback(async (files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return;
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sem sessão");
      const added: string[] = [];
      for (const f of imgs.slice(0, max - value.length)) {
        const path = `${user.id}/${folder}/${Date.now()}-${f.name.replace(/[^\w.-]+/g, "_")}`;
        const { error } = await supabase.storage.from("vet-files").upload(path, f, { upsert: false });
        if (error) throw error;
        added.push(path);
      }
      onChange([...value, ...added]);
    } catch (e) {
      toast.error("Falha no envio: " + (e as Error).message);
    } finally { setBusy(false); }
  }, [folder, max, onChange, value]);

  const remove = async (path: string) => {
    await supabase.storage.from("vet-files").remove([path]).catch(() => {});
    onChange(value.filter((p) => p !== path));
  };

  return (
    <div className="space-y-2">
      {label && <div className="text-xs text-muted-foreground">{label} ({value.length}/{max})</div>}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {value.map((p) => (
          <Thumb key={p} path={p} onRemove={() => remove(p)} />
        ))}
        {value.length < max && (
          <div className="flex aspect-square flex-col gap-1">
            <label className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-border bg-card/40 text-muted-foreground transition hover:border-primary/60 hover:text-primary">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              <span className="text-[10px]">Galeria</span>
              <input
                type="file" accept="image/*" multiple
                className="hidden"
                onChange={(e) => { if (e.target.files) upload(Array.from(e.target.files)); e.target.value = ""; }}
              />
            </label>
            <label className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-border bg-card/40 text-muted-foreground transition hover:border-primary/60 hover:text-primary">
              <Camera className="h-4 w-4" />
              <span className="text-[10px]">Câmera</span>
              <input
                type="file" accept="image/*" capture="environment"
                className="hidden"
                onChange={(e) => { if (e.target.files) upload(Array.from(e.target.files)); e.target.value = ""; }}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

function Thumb({ path, onRemove }: { path: string; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    supabase.storage.from("vet-files").createSignedUrl(path, 3600)
      .then(({ data }) => { if (alive) setUrl(data?.signedUrl ?? null); });
    return () => { alive = false; };
  }, [path]);
  return (
    <div className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-black/20">
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full animate-pulse bg-muted" />}
      <button
        type="button" onClick={onRemove}
        className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white opacity-0 transition group-hover:opacity-100"
        aria-label="Remover"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
