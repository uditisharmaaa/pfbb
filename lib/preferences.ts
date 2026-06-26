import { z } from "zod";
import type { Area, Preferences, PropType, Style } from "./types";

export const AREAS = ["Downtown Dubai", "Jumeirah"] as const satisfies readonly Area[];
export const PROP_TYPES = ["apartment", "penthouse", "villa", "townhouse"] as const satisfies readonly PropType[];
export const STYLES = ["modern", "minimalist", "classic", "luxury", "industrial", "arabesque"] as const satisfies readonly Style[];

export const DEFAULT_PREFERENCES: Preferences = {
  intent: "buy",
  areas: [],
  types: [],
  styles: [],
  mustHave: [],
  dealbreakers: [],
  count: 3,
};

export const PreferencesSchema = z.object({
  intent: z.enum(["buy", "rent"]),
  areas: z.array(z.enum(AREAS)),
  types: z.array(z.enum(PROP_TYPES)),
  bedrooms: z.number().int().min(0).max(10).optional(),
  budgetMax: z.number().int().positive().optional(),
  styles: z.array(z.enum(STYLES)),
  mustHave: z.array(z.string().trim().min(1)).default([]),
  dealbreakers: z.array(z.string().trim().min(1)).default([]),
  count: z.number().int().min(1).max(8).default(3),
  notes: z.string().trim().optional(),
});

export const RefineRequestSchema = z.object({
  preferences: PreferencesSchema,
  message: z.string().trim().min(1).max(1200),
});

export function normalizePreferences(value: unknown): Preferences {
  const parsed = PreferencesSchema.partial()
    .transform((partial) => ({ ...DEFAULT_PREFERENCES, ...partial }))
    .pipe(PreferencesSchema)
    .safeParse(value);

  return parsed.success ? parsed.data : DEFAULT_PREFERENCES;
}

export function parsePreferencesParam(value: string | null): Preferences {
  if (!value) {
    return DEFAULT_PREFERENCES;
  }

  try {
    return normalizePreferences(JSON.parse(value));
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export const preferencesJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["intent", "areas", "types", "styles", "mustHave", "dealbreakers", "count"],
  properties: {
    intent: { type: "string", enum: ["buy", "rent"] },
    areas: {
      type: "array",
      items: { type: "string", enum: ["Downtown Dubai", "Jumeirah"] },
    },
    types: {
      type: "array",
      items: { type: "string", enum: ["apartment", "penthouse", "villa", "townhouse"] },
    },
    bedrooms: { type: "integer", minimum: 0, maximum: 10 },
    budgetMax: { type: "integer", minimum: 1 },
    styles: {
      type: "array",
      items: { type: "string", enum: ["modern", "minimalist", "classic", "luxury", "industrial", "arabesque"] },
    },
    mustHave: {
      type: "array",
      items: { type: "string" },
    },
    dealbreakers: {
      type: "array",
      items: { type: "string" },
    },
    count: { type: "integer", minimum: 1, maximum: 8 },
    notes: { type: "string" },
  },
} as const;
