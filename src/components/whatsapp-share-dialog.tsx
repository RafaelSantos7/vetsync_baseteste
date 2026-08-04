import { useEffect, useState } from "react";
import { Loader2, FileDown, ShieldCheck } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { pdfMedicalRecordBlob, type VetInfo } from "@/lib/pdf";
import { openWa, waLink } from "@/lib/whatsapp";
import { logAudit } from "@/lib/audit";

const EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7; // 7 dias

export type ShareRecord = {
  id: string;
  appointment_date: string;
  weight: number | null;
  temperature: number | null;
  anamnesis: string | null;
  symptoms: string | null;
  diagnosis: string | null;
  prescription: string | null;
  observations: string | null;
  signature_url: string | null;
};

type SharePet = { id: string; name: string; species?: string | null; breed?: string | null; sex?: string | null; weight?: number | null; client_id: string };
type ShareClient = { id: string; name: string; document?: string | null; phone?: string | null; whatsapp?: string | null };

export function WhatsAppShareDialog({
  open, onOpenChange, record, pet, client, vet,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  record: ShareRecord | null;
  pet: SharePet | null;
  client: ShareClient | null;
  vet: VetInfo;
}) {
  const [phone, setPhone] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setPhone(client?.whatsapp || client?.phone || "");
      setAuthorized(false);
      setLink(null);
    }
  }, [open, client]);

  const dateLabel = record ? new Date(record.appointment_date).toLocaleDateString("pt-BR") : "";
  const message = [
    `Olá ${client?.name ?? ""}!`.trim(),
    ``,
    `Segue o prontuário do atendimento de ${pet?.name ?? "seu animal"} realizado em ${dateLabel}.`,
    link ? `` : null,
    link ? `Documento (link temporário, válido por 7 dias):` : null,
    link,
    ``,
    `${vet.vetName ?? "VetSystem"}${vet.crmv ? ` — CRMV ${vet.crmv}` : ""}`,
  ].filter((l) => l !== null).join("\n");

  async function generate() {
    if (!record || !pet) return;
    setBusy(true);
    try {
      const blob = pdfMedicalRecordBlob({ vet, pet, client, record });
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Sessão expirada. Entre novamente.");

      const path = `${uid}/prontuarios/${record.id}-${Date.now()}.pdf`;
      const up = await supabase.storage.from("vet-files").upload(path, blob, {
        contentType: "application/pdf", upsert: true,
      });
      if (up.error) throw up.error;

      const signed = await supabase.storage.from("vet-files").createSignedUrl(path, EXPIRES_IN_SECONDS);
      if (signed.error || !signed.data?.signedUrl) throw signed.error ?? new Error("Falha ao gerar link");

      setLink(signed.data.signedUrl);

      await supabase.from("document_shares").insert({
        owner_id: uid,
        medical_record_id: record.id,
        pet_id: pet.id,
        client_id: client?.id ?? null,
        channel: "whatsapp",
        phone,
        storage_path: path,
        expires_at: new Date(Date.now() + EXPIRES_IN_SECONDS * 1000).toISOString(),
        status: "link_created",
      });
      await logAudit("record_link_created", "prontuarios", record.id, { pet_id: pet.id, expires_in_days: 7 });
      toast.success("PDF gerado e link temporário criado.");
    } catch (e) {
      const msg = (e as Error).message;
      toast.error(`Não foi possível gerar o documento: ${msg}`);
      await logAudit("record_share_error", "prontuarios", record?.id, { error: msg });
    } finally {
      setBusy(false);
    }
  }

  async function sendWhats() {
    if (!phone || !link || !record) return;
    openWa(phone, message);
    await supabase.from("document_shares")
      .update({ status: "whatsapp_opened" })
      .eq("medical_record_id", record.id)
      .eq("storage_path", link.split("?")[0].split("/vet-files/")[1] ?? "");
    await logAudit("record_whatsapp_opened", "prontuarios", record.id, { phone });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <WhatsAppIcon className="h-5 w-5 fill-[#25D366]" />
            Enviar prontuário pelo WhatsApp
          </DialogTitle>
          <DialogDescription className="text-xs">
            O link é assinado, temporário (7 dias) e dá acesso apenas a este documento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-background/40 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground text-xs">Tutor</span>
              <span className="break-all font-medium">{client?.name ?? "—"}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground text-xs">Animal</span>
              <span className="break-all font-medium">{pet?.name ?? "—"}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground text-xs">Atendimento</span>
              <span className="font-medium">{dateLabel}</span>
            </div>
          </div>

          <div>
            <Label className="text-xs">Telefone (WhatsApp)</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" inputMode="tel" />
          </div>

          <div>
            <Label className="text-xs">Prévia da mensagem</Label>
            <Textarea readOnly rows={6} value={message} className="text-xs" />
          </div>

          <label className="flex items-start gap-2 rounded-lg border border-border bg-background/40 p-3">
            <Checkbox checked={authorized} onCheckedChange={(v) => setAuthorized(Boolean(v))} className="mt-0.5" />
            <span className="text-xs text-muted-foreground">
              Confirmo que este telefone pertence ao responsável autorizado a receber o documento.
            </span>
          </label>

          {link && (
            <Badge variant="outline" className="w-full justify-start gap-1.5 whitespace-normal break-all py-2 text-[10px]">
              <ShieldCheck className="h-3 w-3 shrink-0 text-[#25D366]" /> Link temporário gerado
            </Badge>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="w-full sm:w-auto" disabled={busy || !record} onClick={generate}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FileDown className="mr-1 h-4 w-4" />}
            {link ? "Gerar novamente" : "Gerar PDF e link"}
          </Button>
          <Button
            className="w-full bg-[#25D366] text-white hover:bg-[#128C7E] sm:w-auto"
            disabled={!link || !phone || !authorized}
            onClick={sendWhats}
            asChild={false}
          >
            <WhatsAppIcon className="mr-1 h-4 w-4 fill-white" /> Abrir WhatsApp
          </Button>
        </DialogFooter>
        {link && phone && (
          <p className="break-all text-[10px] text-muted-foreground">
            {waLink(phone)}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
