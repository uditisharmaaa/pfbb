import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES, normalizePreferences, parsePreferencesParam, PreferencesSchema } from "../lib/preferences";

describe("preferences", () => {
  it("normalizes partial preferences with defaults", () => {
    const preferences = normalizePreferences({
      intent: "rent",
      areas: ["Jumeirah"],
      types: [],
      styles: [],
      mustHave: ["garden"],
      dealbreakers: [],
      count: 5,
    });

    expect(preferences.intent).toBe("rent");
    expect(preferences.areas).toEqual(["Jumeirah"]);
    expect(preferences.count).toBe(5);
  });

  it("falls back to defaults on bad input", () => {
    expect(parsePreferencesParam("{bad json")).toEqual(DEFAULT_PREFERENCES);
    expect(normalizePreferences({ intent: "lease" })).toEqual(DEFAULT_PREFERENCES);
  });

  it("rejects unknown enum values", () => {
    const parsed = PreferencesSchema.safeParse({
      ...DEFAULT_PREFERENCES,
      areas: ["Dubai Marina"],
    });

    expect(parsed.success).toBe(false);
  });
});
