import type { Preferences, Property } from "./types";

export function getDemoFallbackPreferences(preferences: Preferences, message: string, visibleProperties: Property[]): Preferences | null {
  const lower = message.toLowerCase();

  if (lower.includes("burj") || lower.includes("khalifa") || lower.includes("family")) {
    return {
      ...preferences,
      intent: "buy",
      areas: ["Downtown Dubai"],
      types: ["apartment"],
      bedrooms: lower.includes("3") || lower.includes("three") ? 3 : preferences.bedrooms,
      styles: lower.includes("modern") ? ["modern"] : preferences.styles,
      mustHave: Array.from(new Set([...preferences.mustHave, "family-friendly"])),
      count: preferences.count || 3,
      notes: "User wants a family-friendly Downtown home near Burj Khalifa.",
    };
  }

  if (lower.includes("too pricey") || lower.includes("cheaper") || lower.includes("budget")) {
    const activePrices = visibleProperties
      .map((property) => (preferences.intent === "rent" ? property.rentAED : property.priceAED))
      .filter((price): price is number => typeof price === "number" && Number.isFinite(price));
    const lowestVisible = activePrices.length > 0 ? Math.min(...activePrices) : preferences.budgetMax;

    return {
      ...preferences,
      budgetMax: lowestVisible ? Math.round(lowestVisible * 0.85) : preferences.budgetMax,
      notes: [preferences.notes, "User asked for a cheaper set."].filter(Boolean).join(" "),
    };
  }

  if (lower.includes("jumeirah") && (lower.includes("villa") || lower.includes("villas"))) {
    return {
      ...preferences,
      areas: ["Jumeirah"],
      types: ["villa"],
      styles: preferences.styles.length > 0 ? preferences.styles : ["luxury"],
      notes: "User wants villas in Jumeirah.",
    };
  }

  if (lower.includes("different style") || lower.includes("don't like the style") || lower.includes("dont like the style")) {
    const visibleStyles = visibleProperties.map((property) => property.style);

    return {
      ...preferences,
      styles: [],
      dealbreakers: Array.from(new Set([...preferences.dealbreakers, ...visibleStyles])),
      notes: "User rejected the currently visible style direction.",
    };
  }

  return null;
}
