// Click-to-chat helpers for WhatsApp. No backend required.
export function normalizePhone(raw: string): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  // Brazil default if missing country code
  if (digits.length <= 11) return `55${digits}`;
  return digits;
}

export function waLink(phone: string, message?: string): string {
  const p = normalizePhone(phone);
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${p}${text}`;
}

export function openWa(phone: string, message?: string) {
  if (typeof window === "undefined") return;
  window.open(waLink(phone, message), "_blank", "noopener,noreferrer");
}

export const MESSAGE_TEMPLATES = {
  lembreteConsulta: (nome: string, data: string) =>
    `Olá ${nome}! Lembrete da sua consulta veterinária em ${data}. Confirma presença? 🐾`,
  vacinaVencida: (nome: string, pet: string, vacina: string) =>
    `Olá ${nome}! A vacina ${vacina} do(a) ${pet} está vencida. Vamos agendar reforço?`,
  retornoVisita: (nome: string) =>
    `Olá ${nome}, tudo bem? Estou passando para saber como está o paciente após a visita. 🐎`,
  cobranca: (nome: string, valor: string, venc: string) =>
    `Olá ${nome}! Lembrete do pagamento de R$ ${valor} com vencimento em ${venc}. Obrigado!`,
};
