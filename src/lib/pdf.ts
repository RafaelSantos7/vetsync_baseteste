import { jsPDF } from "jspdf";

interface VetInfo {
  vetName?: string;
  crmv?: string;
  clinicName?: string;
}

interface Pet {
  name: string;
  species?: string | null;
  breed?: string | null;
  sex?: string | null;
  weight?: number | null;
}

interface Client {
  name: string;
  document?: string | null;
  phone?: string | null;
}

function header(doc: jsPDF, title: string, vet: VetInfo) {
  doc.setFillColor(20, 30, 48);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(vet.clinicName ?? "VetSystem", 14, 12);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`${vet.vetName ?? ""}  ${vet.crmv ? `CRMV ${vet.crmv}` : ""}`, 14, 19);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(title.toUpperCase(), 210 - 14, 18, { align: "right" });
  doc.setTextColor(0, 0, 0);
}

function footer(doc: jsPDF, signatureUrl?: string) {
  const y = 270;
  if (signatureUrl) {
    try {
      doc.addImage(signatureUrl, "PNG", 75, y - 25, 60, 25);
    } catch { /* ignore */ }
  }
  doc.setDrawColor(120);
  doc.line(70, y, 140, y);
  doc.setFontSize(9);
  doc.text("Assinatura do Veterinário", 105, y + 5, { align: "center" });
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")} — VetSystem`, 105, 288, { align: "center" });
}

function infoBlock(doc: jsPDF, pet: Pet, client: Client | null, y: number) {
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Tutor:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${client?.name ?? "—"}  ${client?.document ? `(${client.document})` : ""}`, 32, y);
  doc.setFont("helvetica", "bold");
  doc.text("Paciente:", 14, y + 6);
  doc.setFont("helvetica", "normal");
  doc.text(
    `${pet.name} — ${pet.species ?? ""} ${pet.breed ?? ""} ${pet.sex ?? ""} ${pet.weight ? pet.weight + "kg" : ""}`,
    32, y + 6,
  );
  doc.setDrawColor(220);
  doc.line(14, y + 10, 196, y + 10);
}

export function pdfPrescription(opts: {
  vet: VetInfo; pet: Pet; client: Client | null; prescription: string; signatureUrl?: string;
}) {
  const doc = new jsPDF();
  header(doc, "Receituário", opts.vet);
  infoBlock(doc, opts.pet, opts.client, 40);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Prescrição:", 14, 62);
  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(opts.prescription || "—", 180);
  doc.text(lines, 14, 70);
  footer(doc, opts.signatureUrl);
  doc.save(`receita-${opts.pet.name}.pdf`);
}

export function pdfAttestation(opts: {
  vet: VetInfo; pet: Pet; client: Client | null; text: string; signatureUrl?: string;
}) {
  const doc = new jsPDF();
  header(doc, "Atestado", opts.vet);
  infoBlock(doc, opts.pet, opts.client, 40);
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(opts.text, 180);
  doc.text(lines, 14, 64);
  footer(doc, opts.signatureUrl);
  doc.save(`atestado-${opts.pet.name}.pdf`);
}

export function pdfVaccineCard(opts: {
  vet: VetInfo; pet: Pet; client: Client | null;
  vaccines: { name: string; applied_at: string; next_due?: string | null; notes?: string | null }[];
}) {
  const doc = new jsPDF();
  header(doc, "Carteira de Vacinação", opts.vet);
  infoBlock(doc, opts.pet, opts.client, 40);

  let y = 64;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setFillColor(240, 240, 245);
  doc.rect(14, y - 5, 182, 8, "F");
  doc.text("Vacina", 16, y);
  doc.text("Aplicação", 90, y);
  doc.text("Próxima dose", 130, y);
  doc.text("Obs.", 170, y);
  y += 6;
  doc.setFont("helvetica", "normal");

  opts.vaccines.forEach((v) => {
    if (y > 250) { doc.addPage(); y = 30; }
    doc.text(v.name, 16, y);
    doc.text(new Date(v.applied_at).toLocaleDateString("pt-BR"), 90, y);
    doc.text(v.next_due ? new Date(v.next_due).toLocaleDateString("pt-BR") : "—", 130, y);
    doc.text((v.notes ?? "").slice(0, 14), 170, y);
    y += 6;
  });

  footer(doc);
  doc.save(`vacinas-${opts.pet.name}.pdf`);
}
