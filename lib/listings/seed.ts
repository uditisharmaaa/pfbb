import { SEED_PROPERTIES } from "../properties";
import { rankProperties } from "../rank";
import type { Preferences, PropertySearchResult } from "../types";
import type { ListingProvider } from "./types";

export class SeedListingProvider implements ListingProvider {
  async search(preferences: Preferences): Promise<PropertySearchResult> {
    return {
      properties: rankProperties(SEED_PROPERTIES, preferences),
      source: "seed",
      reason: "seed fallback",
    };
  }
}
