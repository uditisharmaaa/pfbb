"""LLM prompt and preference parsing helpers."""

from __future__ import annotations

import json
import re
from typing import Any

from locations import ABU_DHABI_AREAS, DUBAI_AREAS
from rank import DEFAULT_PREFERENCES

REFINE_SYSTEM_PROMPT = """You maintain a property-search preference object for the UAE.

Cities: "Dubai", "Abu Dhabi".
Dubai areas: "Downtown Dubai", "Jumeirah".
Abu Dhabi areas: "Al Maryah Island", "Al Reem Island", "Khalifa City", "Saadiyat Island".
Types allowed: "apartment", "penthouse", "villa", "townhouse".
Styles allowed: "modern", "minimalist", "classic", "luxury", "industrial", "arabesque".

Important geography:
- Hub71 is in Abu Dhabi (Al Maryah Island / ADGM). NEVER map Hub71 to Dubai.
- ISC Khalifa (SABIS) is in Abu Dhabi (Khalifa City area).
- If the user mentions both Hub71 and ISC Khalifa, prefer areas that commute to both:
  "Al Reem Island", "Khalifa City", "Al Maryah Island" (in that order).
- Burj Khalifa / Dubai Mall => Downtown Dubai.
- Jumeirah => Dubai.

Given CURRENT preferences JSON, currently shown properties (if any), and a new user message,
return ONLY the UPDATED preferences JSON object — no prose, no markdown, no code fences.

Rules:
- Merge, don't reset. Keep prior fields unless the user contradicts them.
- count defaults to 3; honor requests like "show me 5".
- "too pricey" => set budgetMax to ~85% of the lowest price in currently shown properties.
- "cheaper" => lower budgetMax further (~70% of lowest shown).
- "don't like the style" / "different style" => move current styles into dealbreakers and clear styles.
- Family with kids => prefer enough bedrooms (e.g. 3 kids often needs 4+ beds), add mustHave like "schools" or "play area".
- If user mentions rent/leasing, set intent to "rent".
- Set city correctly. Hub71, SABIS, ISC Khalifa, Khalifa City => city "Abu Dhabi".

Output schema:
{
  "intent": "buy" | "rent",
  "city": "Dubai" | "Abu Dhabi" | null,
  "areas": string[],
  "types": string[],
  "bedrooms": number | null,
  "budgetMax": number | null,
  "styles": string[],
  "mustHave": string[],
  "dealbreakers": string[],
  "nearLandmarks": string[],
  "count": number,
  "notes": string
}"""


def parse_preferences_json(text: str) -> dict[str, Any] | None:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            return None
        try:
            data = json.loads(match.group())
        except json.JSONDecodeError:
            return None

    if not isinstance(data, dict):
        return None

    merged = {**DEFAULT_PREFERENCES, **data}
    merged["count"] = min(max(int(merged.get("count") or 3), 1), 10)

    allowed_areas = set(DUBAI_AREAS + ABU_DHABI_AREAS)
    merged["areas"] = [area for area in merged.get("areas") or [] if area in allowed_areas]

    if merged.get("city") == "Abu Dhabi":
        merged["areas"] = [
            area for area in merged["areas"] if area in ABU_DHABI_AREAS
        ] or merged["areas"]
    elif merged.get("city") == "Dubai":
        merged["areas"] = [area for area in merged["areas"] if area in DUBAI_AREAS] or merged["areas"]

    return merged


def build_refine_user_message(
    preferences: dict[str, Any],
    message: str,
    shown: list[dict[str, Any]] | None = None,
) -> str:
    shown_summary = []
    for prop in shown or []:
        shown_summary.append(
            {
                "id": prop.get("id"),
                "title": prop.get("title"),
                "priceAED": prop.get("priceAED"),
                "rentAED": prop.get("rentAED"),
                "style": prop.get("style"),
                "area": prop.get("area"),
                "city": prop.get("city"),
                "type": prop.get("type"),
            }
        )

    payload = {
        "current_preferences": preferences,
        "currently_shown": shown_summary,
        "user_message": message,
    }
    return json.dumps(payload, indent=2)


def summarize_results(properties: list[dict[str, Any]], preferences: dict[str, Any]) -> str:
    if not properties:
        return (
            "I couldn't find exact matches for that search. "
            "Try widening the budget, area, or bedroom count."
        )

    count = len(properties)
    landmarks = preferences.get("nearLandmarks") or []
    city = preferences.get("city")

    if landmarks and city:
        places = " and ".join(landmarks)
        if count == 1:
            return f"Here is 1 home in {city} with a good commute to {places}."
        return f"Here are {count} homes in {city} with a good commute to {places}."

    if city:
        if count == 1:
            return f"Here is 1 home in {city} that matches your search."
        return f"Here are {count} homes in {city} that match your search."

    if count == 1:
        return "Here is 1 home that matches your search."
    return f"Here are {count} homes that match your search."
