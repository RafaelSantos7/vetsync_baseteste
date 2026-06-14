import type { RxJsonSchema } from "rxdb";

function base<T extends Record<string, any>>(
  props: T,
  required: string[] = [],
  indexes: string[][] = [],
): RxJsonSchema<any> {
  return {
    version: 0,
    primaryKey: "id",
    type: "object",
    properties: {
      id: { type: "string", maxLength: 64 },
      owner_id: { type: ["string", "null"] },
      created_at: { type: ["string", "null"] },
      updated_at: { type: "string", maxLength: 40 },
      is_deleted: { type: "boolean", default: false },
      ...props,
    },
    required: ["id", "updated_at", "is_deleted", ...required],
    indexes: [["is_deleted", "updated_at", "id"], ...indexes],
  };
}

const str = { type: ["string", "null"] } as const;
const num = { type: ["number", "null"] } as const;
const bool = { type: ["boolean", "null"] } as const;
const strArr = { type: ["array", "null"], items: { type: "string" } } as const;
const jsonArr = {
  type: ["array", "null"],
  items: { type: "object", additionalProperties: true },
} as const;

export const SCHEMAS = {
  clients: base(
    {
      name: { type: "string", maxLength: 200 },
      document: str,
      phone: str,
      whatsapp: str,
      email: str,
      address: str,
      city: str,
      notes: str,
    },
    ["name"],
    [["name"]],
  ),

  pets: base(
    {
      client_id: { type: "string", maxLength: 64 },
      name: { type: "string", maxLength: 200 },
      species: str,
      breed: str,
      sex: str,
      birth_date: str,
      weight: num,
      color: str,
      neutered: bool,
      allergies: str,
      diseases: str,
      medications: str,
      photo_urls: strArr,
    },
    ["client_id", "name"],
    [["name"], ["client_id"]],
  ),

  appointments: base(
    {
      client_id: str,
      pet_id: str,
      title: { type: "string", maxLength: 200 },
      category: { type: "string", maxLength: 50 },
      scheduled_at: { type: "string", maxLength: 40 },
      duration_min: num,
      status: str,
      notes: str,
    },
    ["title", "category", "scheduled_at"],
    [["scheduled_at"]],
  ),

  medical_records: base(
    {
      pet_id: { type: "string", maxLength: 64 },
      client_id: str,
      appointment_date: { type: "string", maxLength: 40 },
      weight: num,
      temperature: num,
      anamnesis: str,
      symptoms: str,
      diagnosis: str,
      prescription: str,
      observations: str,
      signature_url: str,
      attachments: jsonArr,
    },
    ["pet_id", "appointment_date"],
    [["pet_id"], ["appointment_date"]],
  ),

  vaccines: base(
    {
      pet_id: { type: "string", maxLength: 64 },
      name: { type: "string", maxLength: 200 },
      applied_at: { type: "string", maxLength: 20 },
      next_due: str,
      notes: str,
    },
    ["pet_id", "name", "applied_at"],
    [["pet_id"], ["applied_at"]],
  ),

  financial_transactions: base(
    {
      client_id: str,
      type: { type: "string", maxLength: 20 },
      category: str,
      description: { type: "string", maxLength: 300 },
      amount: { type: "number" },
      due_date: str,
      paid_at: str,
      payment_method: str,
      notes: str,
    },
    ["type", "description", "amount"],
    [],
  ),

  herd_animals: base(
    {
      property_id: { type: "string", maxLength: 64 },
      identification: { type: "string", maxLength: 100 },
      species: str,
      breed: str,
      sex: str,
      birth_date: str,
      status: { type: "string", maxLength: 30 },
      notes: str,
    },
    ["property_id", "identification", "status"],
    [["property_id"]],
  ),

  properties: base(
    {
      client_id: str,
      name: { type: "string", maxLength: 200 },
      address: str,
      city: str,
      state: str,
      latitude: num,
      longitude: num,
      area_hectares: num,
      notes: str,
    },
    ["name"],
    [["name"]],
  ),

  rural_visits: base(
    {
      property_id: { type: "string", maxLength: 64 },
      scheduled_at: { type: "string", maxLength: 40 },
      completed_at: str,
      latitude: num,
      longitude: num,
      purpose: str,
      notes: str,
    },
    ["property_id", "scheduled_at"],
    [["property_id"], ["scheduled_at"]],
  ),

  odontograms: base(
    {
      pet_id: str,
      exam_date: { type: "string", maxLength: 40 },
      notes: str,
    },
    ["exam_date"],
    [["exam_date"]],
  ),

  odontogram_teeth: base(
    {
      odontogram_id: { type: "string", maxLength: 64 },
      tooth_number: { type: "number" },
      status: str,
      procedure: str,
      notes: str,
      images: strArr,
    },
    ["odontogram_id", "tooth_number"],
    [["odontogram_id"]],
  ),
} as const;

export type CollectionName = keyof typeof SCHEMAS;
export const COLLECTION_NAMES = Object.keys(SCHEMAS) as CollectionName[];
