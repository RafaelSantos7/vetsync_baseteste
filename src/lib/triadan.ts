// Equine Triadan numbering. Order rendered from patient's right to left.
export const UPPER_RIGHT = [111, 110, 109, 108, 107, 106, 105, 104, 103, 102, 101];
export const UPPER_LEFT  = [201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211];
export const LOWER_RIGHT = [411, 410, 409, 408, 407, 406, 405, 404, 403, 402, 401];
export const LOWER_LEFT  = [301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311];

export type ToothStatus =
  | "sadio" | "ausente" | "extraido" | "fraturado"
  | "desgaste" | "restaurado" | "lobo" | "tratamento";

export const STATUS_COLOR: Record<ToothStatus, string> = {
  sadio:       "#1f2937", // slate
  ausente:     "#4b5563",
  extraido:    "#ef4444",
  fraturado:   "#f97316",
  desgaste:    "#eab308",
  restaurado:  "#3b82f6",
  lobo:        "#a855f7",
  tratamento:  "#10b981",
};

export const STATUS_LABEL: Record<ToothStatus, string> = {
  sadio: "Sadio",
  ausente: "Ausente",
  extraido: "Extraído",
  fraturado: "Fraturado",
  desgaste: "Desgaste",
  restaurado: "Restaurado",
  lobo: "Dente de lobo",
  tratamento: "Em tratamento",
};

export function toothKind(n: number): "incisivo" | "canino" | "lobo" | "premolar" | "molar" {
  const t = n % 100;
  if (t >= 1 && t <= 3) return "incisivo";
  if (t === 4) return "canino";
  if (t === 5) return "lobo";
  if (t >= 6 && t <= 8) return "premolar";
  return "molar";
}
