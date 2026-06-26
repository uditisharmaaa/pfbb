import { DEFAULT_PREFERENCES } from "../preferences";
import type { Preferences, PropertySearchResult } from "../types";
import { BayutListingProvider } from "./bayut";
import { SeedListingProvider } from "./seed";

const seedProvider = new SeedListingProvider();

export async function listProperties(preferences: Preferences = DEFAULT_PREFERENCES): Promise<PropertySearchResult> {
  try {
    const bayutProvider = new BayutListingProvider();
    return await bayutProvider.search(preferences);
  } catch (error) {
    const fallback = await seedProvider.search(preferences);
    return {
      ...fallback,
      reason: error instanceof Error ? error.message : "Bayut provider failed",
    };
  }
}

export { BayutListingProvider } from "./bayut";
export { SeedListingProvider } from "./seed";
export { normalizeBayutProperty, inferStyle } from "./normalize";
