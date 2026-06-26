"""Deterministic property ranking against user preferences."""

from __future__ import annotations

from typing import Any

from locations import ABU_DHABI_AREAS, DUBAI_AREAS


def _price(prop: dict[str, Any], intent: str) -> int | None:
    if intent == "rent":
        return prop.get("rentAED")
    return prop.get("priceAED")


def _city(prop: dict[str, Any]) -> str:
    if prop.get("city"):
        return prop["city"]
    if prop.get("area") in ABU_DHABI_AREAS:
        return "Abu Dhabi"
    return "Dubai"


def rank_properties(
    all_properties: list[dict[str, Any]],
    preferences: dict[str, Any],
) -> list[dict[str, Any]]:
    intent = preferences.get("intent", "buy")
    areas = preferences.get("areas") or []
    types = preferences.get("types") or []
    bedrooms = preferences.get("bedrooms")
    budget_max = preferences.get("budgetMax")
    styles = preferences.get("styles") or []
    must_have = [a.lower() for a in (preferences.get("mustHave") or [])]
    dealbreakers = [d.lower() for d in (preferences.get("dealbreakers") or [])]
    near_landmarks = preferences.get("nearLandmarks") or []
    target_city = preferences.get("city")
    count = preferences.get("count") or 3

    candidates: list[tuple[int, dict[str, Any]]] = []

    for prop in all_properties:
        style = prop.get("style", "").lower()
        if style in dealbreakers:
            continue

        price = _price(prop, intent)
        if price is None:
            continue

        if target_city and _city(prop) != target_city:
            continue

        if areas and prop.get("area") not in areas:
            continue

        if types and prop.get("type") not in types:
            continue

        if budget_max is not None and price > budget_max * 1.05:
            continue

        score = 0

        if styles and prop.get("style") in styles:
            score += 3

        prop_beds = prop.get("bedrooms")
        if bedrooms is not None and prop_beds is not None:
            if prop_beds == bedrooms:
                score += 2
            elif abs(prop_beds - bedrooms) == 1:
                score += 1
            elif prop_beds >= bedrooms:
                score += 1

        if types and prop.get("type") in types:
            score += 2

        prop_amenities = [a.lower() for a in prop.get("amenities", [])]
        for tag in must_have:
            if any(tag in amenity for amenity in prop_amenities):
                score += 1

        prop_landmarks = prop.get("nearLandmarks") or []
        for landmark in near_landmarks:
            if landmark in prop_landmarks:
                score += 3

        if len(near_landmarks) >= 2:
            matches = sum(1 for landmark in near_landmarks if landmark in prop_landmarks)
            if matches >= 2:
                score += 4

        if budget_max is not None and price <= budget_max:
            ratio = price / budget_max
            score += max(0, round(2 * (1 - ratio)))

        candidates.append((score, prop))

    candidates.sort(
        key=lambda item: (
            -item[0],
            item[1].get("pricePerSqft", 0),
        )
    )

    return [prop for _, prop in candidates[:count]]


DEFAULT_PREFERENCES: dict[str, Any] = {
    "intent": "buy",
    "city": None,
    "areas": [],
    "types": [],
    "bedrooms": None,
    "budgetMax": None,
    "styles": [],
    "mustHave": [],
    "dealbreakers": [],
    "nearLandmarks": [],
    "count": 3,
    "notes": "",
}
