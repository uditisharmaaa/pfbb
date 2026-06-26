import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES } from "../lib/preferences";
import { SEED_PROPERTIES } from "../lib/properties";
import { rankProperties } from "../lib/rank";
import type { Preferences } from "../lib/types";

describe("rankProperties", () => {
  it("returns the requested number of deterministic results", () => {
    const preferences: Preferences = {
      ...DEFAULT_PREFERENCES,
      areas: ["Downtown Dubai"],
      bedrooms: 3,
      styles: ["modern"],
      count: 3,
    };

    const first = rankProperties(SEED_PROPERTIES, preferences).map((property) => property.id);
    const second = rankProperties(SEED_PROPERTIES, preferences).map((property) => property.id);

    expect(first).toEqual(second);
    expect(first).toHaveLength(3);
    expect(first[0]).toMatch(/^downtown-/);
    expect(rankProperties(SEED_PROPERTIES, preferences)[0].style).toBe("modern");
  });

  it("filters by budget with tolerance and excludes dealbreakers", () => {
    const results = rankProperties(SEED_PROPERTIES, {
      ...DEFAULT_PREFERENCES,
      budgetMax: 3_000_000,
      dealbreakers: ["industrial"],
      count: 8,
    });

    expect(results.every((property) => property.priceAED <= 3_150_000)).toBe(true);
    expect(results.some((property) => property.style === "industrial")).toBe(false);
  });
});
