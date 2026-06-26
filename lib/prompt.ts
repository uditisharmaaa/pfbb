import type { Preferences, Property } from "./types";

export function buildRefineSystemPrompt(): string {
  return [
    "You maintain a property-search preference object for Dubai only.",
    "Allowed areas are Downtown Dubai and Jumeirah.",
    "Return the updated preferences through the required tool call only.",
    "Merge, do not reset. Keep prior fields unless the user clearly contradicts them.",
    "Only use allowed enum values for intent, areas, types, and styles.",
    "The chat refines results; it must never ask follow-up questions before updating preferences.",
    "Relative edits are important:",
    "- too pricey or cheaper: lower budgetMax using visible card prices; use about 85% of the lowest visible active price.",
    "- different style or do not like the style: move visible styles into dealbreakers and clear styles.",
    "- more like the first/second/third one: copy that visible property's area, type, bedrooms, and style into preferences.",
    "- villas in Jumeirah instead: replace area/type preferences with the stated new intent.",
    "count defaults to 3; honor requests like show me 5.",
    "Keep notes only when useful for future ranking.",
  ].join("\n");
}

export function buildRefineUserPrompt(preferences: Preferences, message: string, visibleProperties: Property[]): string {
  const context = visibleProperties.map((property, index) => ({
    index: index + 1,
    id: property.id,
    title: property.title,
    area: property.area,
    type: property.type,
    bedrooms: property.bedrooms,
    style: property.style,
    priceAED: property.priceAED,
    rentAED: property.rentAED,
    amenities: property.amenities,
  }));

  return JSON.stringify(
    {
      currentPreferences: preferences,
      visibleProperties: context,
      userMessage: message,
      output: "Call update_preferences with the full updated Preferences object.",
    },
    null,
    2,
  );
}
