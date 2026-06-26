import type { Preferences, Property, PropertySearchResult } from "../types";

export interface ListingProvider {
  search(preferences: Preferences): Promise<PropertySearchResult>;
}

export type UnknownRecord = Record<string, unknown>;

export interface BayutProviderOptions {
  apiKey?: string;
  host?: string;
  timeoutMs?: number;
}

export interface NormalizationResult {
  property: Property | null;
  reason?: string;
}
