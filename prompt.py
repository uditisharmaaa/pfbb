"""LLM prompt and preference parsing helpers."""

from __future__ import annotations

import json
import re
from typing import Any

from rank import DEFAULT_PREFERENCES

REFINE_SYSTEM_PROMPT = """You maintain a property-search preference object for Dubai.
Areas allowed: "Downtown Dubai", "Jumeirah".
Types allowed: "apartment", "penthouse", "villa", "townhouse".
Styles allowed: "modern", "minimalist", "classic", "luxury", "industrial", "arabesque".

Given CURRENT preferences JSON, currently shown properties (if any), and a new user message,
return ONLY the UPDATED preferences JSON object — no prose, no markdown, no code fences.

Rules:
- Merge, don't reset. Keep prior fields unless the user contradicts them.
- count defaults to 3; honor requests like "show me 5".
- "too pricey" => set budgetMax to ~85% of the lowest price in currently shown properties.
- "cheaper" => lower budgetMax further (~70% of lowest shown).
- "don't like the style" / "different style" => move current styles into dealbreakers and clear styles.
- "villas in Jumeirah" => areas=["Jumeirah"], types=["villa"].
- Family with kids => prefer 3+ bedrooms, add relevant mustHave tags like "play area" if appropriate.
- If user mentions rent/leasing, set intent to "rent".

Output schema:
{
  "intent": "buy" | "rent",
  "areas": string[],
  "types": string[],
  "bedrooms": number | null,
  "budgetMax": number | null,
  "styles": string[],
  "mustHave": string[],
  "dealbreakers": string[],
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
    if count == 1:
        return "Here is 1 home that matches your search."
    return f"Here are {count} homes that match your search."
