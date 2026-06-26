"""Landmark-aware location inference for property search."""

from __future__ import annotations

import re
from typing import Any

ABU_DHABI_AREAS = [
    "Al Maryah Island",
    "Al Reem Island",
    "Khalifa City",
    "Saadiyat Island",
]

DUBAI_AREAS = [
    "Downtown Dubai",
    "Jumeirah",
]

ALL_AREAS = ABU_DHABI_AREAS + DUBAI_AREAS

LANDMARK_HINTS: list[tuple[list[str], str, list[str]]] = [
    (["hub71", "hub 71", "adgm", "al maryah", "maryah island"], "Hub71", ["Al Maryah Island", "Al Reem Island"]),
    (
        ["isc khalifa", "sabis", "international school of ch", "khalifa city"],
        "ISC Khalifa",
        ["Khalifa City", "Al Reem Island"],
    ),
    (["saadiyat"], "Saadiyat", ["Saadiyat Island"]),
    (["reem island", "al reem"], "Al Reem Island", ["Al Reem Island"]),
    (["burj khalifa", "downtown dubai", "dubai mall"], "Downtown Dubai", ["Downtown Dubai"]),
    (["jumeirah"], "Jumeirah", ["Jumeirah"]),
]

COMMUTE_OVERLAP: dict[frozenset[str], list[str]] = {
    frozenset({"Hub71", "ISC Khalifa"}): ["Al Reem Island", "Khalifa City", "Al Maryah Island"],
}


def infer_location_preferences(message: str) -> dict[str, Any]:
    text = message.lower()
    inferred: dict[str, Any] = {
        "areas": [],
        "city": None,
        "nearLandmarks": [],
        "bedrooms": None,
        "mustHave": [],
        "notes": "",
    }

    area_scores: dict[str, int] = {}
    landmarks: list[str] = []

    for keywords, landmark, areas in LANDMARK_HINTS:
        if any(keyword in text for keyword in keywords):
            landmarks.append(landmark)
            for area in areas:
                area_scores[area] = area_scores.get(area, 0) + 1

    if any(token in text for token in ["abu dhabi", "hub71", "hub 71", "sabis", "isc khalifa", "khalifa city"]):
        inferred["city"] = "Abu Dhabi"
    elif "dubai" in text and inferred["city"] != "Abu Dhabi":
        inferred["city"] = "Dubai"

    if landmarks:
        overlap = COMMUTE_OVERLAP.get(frozenset(landmarks))
        if overlap:
            inferred["areas"] = overlap
        else:
            inferred["areas"] = sorted(area_scores, key=area_scores.get, reverse=True)

    kids_match = re.search(r"(\d+)\s+kids?", text)
    if kids_match:
        kids = int(kids_match.group(1))
        inferred["bedrooms"] = max(3, kids + 1)
        inferred["mustHave"].extend(["play area", "schools"])

    if any(token in text for token in ["family", "kids", "children", "school"]):
        inferred["mustHave"].append("schools")

    if any(token in text for token in ["near work", "close to work", "commute", "proximity", "proxomity"]):
        inferred["notes"] = "Prioritize commute to work and school."

    inferred["nearLandmarks"] = landmarks
    inferred["mustHave"] = list(dict.fromkeys(inferred["mustHave"]))
    return inferred


def merge_preferences(
    llm_preferences: dict[str, Any],
    inferred: dict[str, Any],
    message: str,
) -> dict[str, Any]:
    merged = {**llm_preferences}

    if inferred.get("city"):
        merged["city"] = inferred["city"]

    if inferred.get("areas"):
        llm_areas = merged.get("areas") or []
        dubai_only = llm_areas and all(area in DUBAI_AREAS for area in llm_areas)
        abu_dhabi_query = inferred["city"] == "Abu Dhabi" or inferred.get("nearLandmarks")

        if not llm_areas or (abu_dhabi_query and dubai_only):
            merged["areas"] = inferred["areas"]
        elif inferred["areas"]:
            merged["areas"] = list(dict.fromkeys(inferred["areas"] + llm_areas))

    if inferred.get("nearLandmarks"):
        merged["nearLandmarks"] = inferred["nearLandmarks"]

    if inferred.get("bedrooms") and not merged.get("bedrooms"):
        merged["bedrooms"] = inferred["bedrooms"]

    for tag in inferred.get("mustHave", []):
        must_have = merged.setdefault("mustHave", [])
        if tag not in must_have:
            must_have.append(tag)

    if inferred.get("notes"):
        existing = merged.get("notes") or ""
        merged["notes"] = f"{existing} {inferred['notes']}".strip()

    user_text = message.lower()
    user_mentioned_type = any(
        token in user_text for token in ["villa", "townhouse", "apartment", "penthouse", "flat", "room"]
    )
    if inferred.get("nearLandmarks") and not user_mentioned_type:
        merged["types"] = []

    if not merged.get("areas") and merged.get("city") == "Abu Dhabi":
        merged["areas"] = ABU_DHABI_AREAS[:3]

    if not merged.get("areas") and merged.get("city") == "Dubai":
        merged["areas"] = DUBAI_AREAS

    return merged
