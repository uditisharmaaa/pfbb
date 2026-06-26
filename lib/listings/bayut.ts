import type { Area, Preferences, PropType, PropertySearchResult } from "../types";
import { rankProperties } from "../rank";
import { normalizeBayutProperty } from "./normalize";
import type { BayutProviderOptions, ListingProvider, UnknownRecord } from "./types";

const AREA_QUERIES: Record<Area, string> = {
  "Downtown Dubai": "Downtown Dubai",
  Jumeirah: "Jumeirah",
};

const AREA_SLUGS: Record<Area, string> = {
  "Downtown Dubai": "/dubai/downtown-dubai",
  Jumeirah: "/dubai/jumeirah",
};

const CATEGORY_MAP: Record<PropType, string> = {
  apartment: "apartments",
  penthouse: "penthouse",
  villa: "villas",
  townhouse: "townhouses",
};

const DEFAULT_TIMEOUT_MS = 6500;

const locationCache = new Map<string, string>();

export class BayutListingProvider implements ListingProvider {
  private readonly apiKey: string | undefined;
  private readonly host: string | undefined;
  private readonly timeoutMs: number;

  constructor(options: BayutProviderOptions = {}) {
    this.apiKey = options.apiKey?.trim() || process.env.BAYUT_API_KEY?.trim();
    this.host = options.host?.trim() || process.env.BAYUT_API_HOST?.trim();
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async search(preferences: Preferences): Promise<PropertySearchResult> {
    if (!this.apiKey || !this.host) {
      throw new Error("Bayut API credentials are not configured");
    }

    const locationIds = await this.resolveLocationIds(preferences.areas.length > 0 ? preferences.areas : ["Downtown Dubai", "Jumeirah"]);
    const rawProperties = await this.searchProperties(preferences, locationIds);
    const normalized = rawProperties
      .map((item) => normalizeBayutProperty(item))
      .filter((property) => property !== null);

    if (normalized.length === 0) {
      throw new Error("Bayut returned no usable Dubai listings");
    }

    return {
      properties: rankProperties(normalized, preferences),
      source: "bayut",
    };
  }

  private async resolveLocationIds(areas: Area[]): Promise<string[]> {
    const ids: string[] = [];

    for (const area of areas) {
      const cached = locationCache.get(area);
      if (cached) {
        ids.push(cached);
        continue;
      }

      const url = this.url("/autocomplete");
      url.searchParams.set("query", AREA_QUERIES[area]);
      url.searchParams.set("langs", "en");
      const data = await this.request(url, { method: "GET" });
      const matches = extractArray(data);
      const best = matches.find((match) => locationHasExactSlug(match, area)) || matches.find((match) => locationMatchesArea(match, area)) || matches[0];
      const id = extractLocationId(best);

      if (id) {
        locationCache.set(area, id);
        ids.push(id);
      }
    }

    return ids;
  }

  private async searchProperties(preferences: Preferences, locationIds: string[]): Promise<unknown[]> {
    const url = this.url("/search-property");
    url.searchParams.set("purpose", preferences.intent === "rent" ? "for-rent" : "for-sale");
    url.searchParams.set("page", "1");
    url.searchParams.set("langs", "en");
    url.searchParams.set("sort_order", "popular");

    if (locationIds.length > 0) {
      url.searchParams.set("location_ids", locationIds.join(","));
    }

    if (preferences.types.length > 0) {
      const categories = preferences.types.map((type) => CATEGORY_MAP[type]);
      url.searchParams.set("property_type", categories.join(","));
    }

    if (preferences.bedrooms !== undefined) {
      url.searchParams.set("rooms", String(preferences.bedrooms));
    }

    if (preferences.budgetMax) {
      url.searchParams.set("price_max", String(preferences.budgetMax));
    }

    const data = await this.request(url, { method: "GET" });

    return extractArray(data);
  }

  private async request(url: URL, init: RequestInit): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          "x-rapidapi-key": this.apiKey || "",
          "x-rapidapi-host": this.host || "",
          Accept: "application/json",
          ...(init.headers || {}),
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Bayut API ${response.status}`);
      }

      return response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  private url(pathname: string): URL {
    return new URL(pathname, `https://${this.host}`);
  }
}

function extractArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (!isRecord(value)) {
    return [];
  }

  for (const key of ["hits", "results", "data", "items", "properties", "locations"]) {
    const candidate = value[key];
    if (Array.isArray(candidate)) {
      return candidate;
    }

    if (isRecord(candidate)) {
      const nested = extractArray(candidate);
      if (nested.length > 0) {
        return nested;
      }
    }
  }

  return [];
}

function extractLocationId(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  for (const key of ["externalID", "external_id", "location_id", "locationId", "id"]) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return String(candidate);
    }
  }

  return null;
}

function locationMatchesArea(value: unknown, area: Area): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const text = Object.values(value)
    .map((item) => (typeof item === "string" || typeof item === "number" ? String(item) : ""))
    .join(" ")
    .toLowerCase();

  return area === "Downtown Dubai" ? text.includes("downtown") : text.includes("jumeirah");
}

function locationHasExactSlug(value: unknown, area: Area): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const slug = value.slug;

  if (typeof slug === "string") {
    return slug === AREA_SLUGS[area];
  }

  if (isRecord(slug) && typeof slug.en === "string") {
    return slug.en === AREA_SLUGS[area];
  }

  return false;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
