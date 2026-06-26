import type { Preferences, Property } from "./types";

interface ScoredProperty {
  property: Property;
  score: number;
}

export function rankProperties(properties: readonly Property[], preferences: Preferences): Property[] {
  const count = Math.max(1, preferences.count || 3);
  const dealbreakers = preferences.dealbreakers.map((item) => item.toLowerCase());
  const mustHave = preferences.mustHave.map((item) => item.toLowerCase());

  const scored: ScoredProperty[] = [];

  for (const property of properties) {
    const activePrice = preferences.intent === "rent" ? property.rentAED : property.priceAED;

    if (!activePrice) {
      continue;
    }

    if (preferences.areas.length > 0 && !preferences.areas.includes(property.area)) {
      continue;
    }

    if (preferences.budgetMax && activePrice > preferences.budgetMax * 1.05) {
      continue;
    }

    if (dealbreakers.includes(property.style.toLowerCase())) {
      continue;
    }

    const amenityText = property.amenities.join(" ").toLowerCase();
    const searchText = `${property.title} ${property.description} ${amenityText}`.toLowerCase();

    if (dealbreakers.some((dealbreaker) => dealbreaker && searchText.includes(dealbreaker))) {
      continue;
    }

    let score = 0;

    if (preferences.styles.includes(property.style)) {
      score += 3;
    }

    if (preferences.bedrooms !== undefined) {
      const bedroomDelta = Math.abs(property.bedrooms - preferences.bedrooms);
      if (bedroomDelta === 0) {
        score += 2;
      } else if (bedroomDelta === 1) {
        score += 1;
      }
    }

    if (preferences.types.includes(property.type)) {
      score += 2;
    }

    for (const requiredAmenity of mustHave) {
      if (requiredAmenity && amenityText.includes(requiredAmenity)) {
        score += 1;
      }
    }

    if (preferences.budgetMax) {
      if (activePrice <= preferences.budgetMax) {
        const closeness = activePrice / preferences.budgetMax;
        score += Math.max(0, Math.min(2, closeness * 2));
      } else {
        score += 0.25;
      }
    }

    scored.push({ property, score });
  }

  return scored
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (left.property.pricePerSqft !== right.property.pricePerSqft) {
        return left.property.pricePerSqft - right.property.pricePerSqft;
      }

      return left.property.id.localeCompare(right.property.id);
    })
    .slice(0, count)
    .map((item) => item.property);
}
