import { useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Eraser, Check } from "lucide-react";

interface Props {
  onSave: (dataUrl: string) => void;
}

export function SignaturePad({ onSave }: Props) {
  const ref = useRef<SignatureCanvas>(null);

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-border bg-white">
        <SignatureCanvas
          ref={ref}
          penColor="#0a0a0a"
          canvasProps={{ className: "w-full h-40 rounded-lg" }}
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.clear()}>
          <Eraser className="mr-1 h-3.5 w-3.5" /> Limpar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            const c = ref.current;
            if (!c || c.isEmpty()) return;
            onSave(c.getCanvas().toDataURL("image/png"));
          }}
        >
          <Check className="mr-1 h-3.5 w-3.5" /> Confirmar assinatura
        </Button>
      </div>
    </div>
  );
}
