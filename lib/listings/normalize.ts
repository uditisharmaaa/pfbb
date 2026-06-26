import type { Area, Broker, PropType, Property, Style } from "../types";
import type { UnknownRecord } from "./types";

const FALLBACK_BROKER: Broker = {
  name: "Bayut Partner Agent",
  agency: "Bayut",
  phone: "+971 50 000 0000",
  whatsapp: "971500000000",
};

const keywordAmenities = [
  "pool",
  "gym",
  "parking",
  "balcony",
  "garden",
  "terrace",
  "maid room",
  "beach access",
  "burj view",
  "fountain view",
  "concierge",
  "security",
  "smart home",
  "family-friendly",
];

export function normalizeBayutProperty(raw: unknown): Property | null {
  if (!isRecord(raw)) {
    return null;
  }

  const title = localizedString(raw.title) || firstString(raw, ["name", "heading"]) || "Dubai property";
  const description = cleanText(localizedString(raw.description) || firstString(raw, ["description_html", "summary"]) || title);
  const locationText = collectLocationText(raw);
  const area = detectArea(`${title} ${description} ${locationText}`);

  if (!area) {
    return null;
  }

  const coordinates = extractCoordinates(raw);

  if (!coordinates) {
    return null;
  }

  const price = firstNumber(raw, ["price", "price_value", "priceAED", "price_aed"]);
  const rent = detectRent(raw) ? price : firstNumber(raw, ["rent", "rentAED", "annual_rent"]);
  const salePrice = detectRent(raw) ? firstNumber(raw, ["sale_price", "salePrice"]) || price || 0 : price || 0;
  const rawArea = firstNumber(raw, ["area", "area_sqft", "size", "sizeSqft"]) || 1000;
  const sizeSqft = Math.max(1, Math.round(rawArea < 800 ? rawArea * 10.7639 : rawArea));
  const type = inferType(`${title} ${description} ${stringifyValue(raw.category)} ${stringifyValue(raw.type)}`);
  const amenities = inferAmenities(raw, `${title} ${description}`);
  const broker = extractBroker(raw);
  const id = String(firstString(raw, ["externalID", "external_id", "id", "reference_number", "referenceNumber"]) || `bayut-${title}-${coordinates.lat}-${coordinates.lng}`);
  const images = extractImages(raw);
  const propertyPrice = Math.max(1, salePrice || price || 1);

  return {
    id: `bayut-${id}`,
    title,
    area,
    type,
    bedrooms: Math.max(0, Math.round(firstNumber(raw, ["rooms", "bedrooms", "beds"]) || 0)),
    bathrooms: Math.max(0, Math.round(firstNumber(raw, ["baths", "bathrooms", "baths_number"]) || 0)),
    sizeSqft,
    priceAED: propertyPrice,
    rentAED: rent,
    style: inferStyle(`${title} ${description} ${amenities.join(" ")}`),
    description: description.length > 220 ? `${description.slice(0, 217).trim()}...` : description,
    amenities,
    pricePerSqft: Math.max(1, Math.round(propertyPrice / sizeSqft)),
    lat: coordinates.lat,
    lng: coordinates.lng,
    cameraHeading: area === "Downtown Dubai" ? 210 : 125,
    images,
    broker,
    listingUrl: firstString(raw, ["url", "listing_url", "listingUrl", "share_url", "shareUrl"]),
    source: "bayut",
  };
}

export function inferStyle(text: string): Style {
  const lower = text.toLowerCase();

  if (matchesAny(lower, ["arabesque", "majlis", "islamic", "mashrabiya", "courtyard"])) {
    return "arabesque";
  }

  if (matchesAny(lower, ["industrial", "loft", "concrete", "warehouse", "exposed"])) {
    return "industrial";
  }

  if (matchesAny(lower, ["classic", "traditional", "heritage", "elegant", "villa compound"])) {
    return "classic";
  }

  if (matchesAny(lower, ["minimal", "minimalist", "clean", "simple", "neutral"])) {
    return "minimalist";
  }

  if (matchesAny(lower, ["luxury", "premium", "signature", "branded", "penthouse", "private pool", "burj view", "fountain view"])) {
    return "luxury";
  }

  return "modern";
}

function inferType(text: string): PropType {
  const lower = text.toLowerCase();

  if (lower.includes("penthouse")) {
    return "penthouse";
  }

  if (lower.includes("townhouse")) {
    return "townhouse";
  }

  if (lower.includes("villa")) {
    return "villa";
  }

  return "apartment";
}

function detectArea(text: string): Area | null {
  const lower = text.toLowerCase();

  if (lower.includes("downtown") || lower.includes("burj khalifa") || lower.includes("dubai mall") || lower.includes("opera district")) {
    return "Downtown Dubai";
  }

  if (
    matchesAny(lower, [
      "jumeirah village",
      "jumeirah lake",
      "palm jumeirah",
      "jumeirah beach residence",
      "jbr",
      "jumeirah park",
      "jumeirah golf",
      "jumeirah islands",
      "madinat jumeirah",
      "jumeirah garden city",
    ])
  ) {
    return null;
  }

  if (lower.includes("jumeirah") || lower.includes("kite beach") || lower.includes("beach road")) {
    return "Jumeirah";
  }

  return null;
}

function inferAmenities(raw: UnknownRecord, text: string): string[] {
  const explicitAmenities = extractAmenityStrings(raw);
  const lower = `${text} ${explicitAmenities.join(" ")}`.toLowerCase();
  const amenities = new Set<string>();

  for (const amenity of explicitAmenities) {
    amenities.add(amenity.toLowerCase());
  }

  for (const amenity of keywordAmenities) {
    if (lower.includes(amenity)) {
      amenities.add(amenity);
    }
  }

  if (lower.includes("beach") || lower.includes("shore")) {
    amenities.add("beach access");
  }

  if (lower.includes("family") || lower.includes("school")) {
    amenities.add("family-friendly");
  }

  return Array.from(amenities).slice(0, 10);
}

function extractAmenityStrings(raw: UnknownRecord): string[] {
  const candidates = [raw.amenities, raw.features, raw.facilities];
  const amenities: string[] = [];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) {
      continue;
    }

    for (const item of candidate) {
      if (typeof item === "string") {
        amenities.push(item);
      } else if (isRecord(item)) {
        const value = firstString(item, ["name", "title", "text"]);
        if (value) {
          amenities.push(value);
        }
      }
    }
  }

  return amenities;
}

function extractBroker(raw: UnknownRecord): Broker {
  const agent = isRecord(raw.agent) ? raw.agent : {};
  const ownerAgent = isRecord(raw.ownerAgent) ? raw.ownerAgent : {};
  const agency = isRecord(raw.agency) ? raw.agency : {};
  const contact = isRecord(agent.contact) ? agent.contact : {};
  const phoneNumber = isRecord(raw.phoneNumber) ? raw.phoneNumber : {};
  const phone =
    firstString(agent, ["phone", "mobile", "contact_number"]) ||
    firstString(contact, ["phone", "mobile"]) ||
    firstString(phoneNumber, ["mobile", "phone", "phoneNumbers", "mobileNumbers"]) ||
    FALLBACK_BROKER.phone;
  const whatsapp = digitsOnly(
    firstString(contact, ["whatsapp", "whatsapp_number"]) ||
      firstString(agent, ["whatsapp", "mobile", "phone"]) ||
      firstString(phoneNumber, ["whatsapp", "mobile", "phone"]) ||
      phone,
  );

  return {
    name:
      firstString(agent, ["name", "user_name", "display_name"]) ||
      firstString(ownerAgent, ["name", "user_name", "display_name"]) ||
      firstString(raw, ["contactName", "contact_name"]) ||
      FALLBACK_BROKER.name,
    agency: firstString(agency, ["name", "agency_name"]) || firstString(raw, ["agency_name"]) || FALLBACK_BROKER.agency,
    phone,
    whatsapp: whatsapp || FALLBACK_BROKER.whatsapp,
  };
}

function extractImages(raw: UnknownRecord): string[] {
  const urls = new Set<string>();
  const candidates = [
    raw.coverPhoto,
    raw.cover_photo,
    raw.photo,
    raw.photos,
    raw.photoURLs,
    raw.photo_urls,
    raw.images,
    raw.media,
  ];

  for (const candidate of candidates) {
    collectImageUrls(candidate, urls);
  }

  return Array.from(urls).slice(0, 3);
}

function collectImageUrls(value: unknown, urls: Set<string>): void {
  if (!value) {
    return;
  }

  if (typeof value === "string" && value.startsWith("http")) {
    urls.add(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectImageUrls(item, urls);
    }
    return;
  }

  if (isRecord(value)) {
    for (const key of ["url", "src", "full", "original", "large", "medium"]) {
      const image = value[key];
      if (typeof image === "string" && image.startsWith("http")) {
        urls.add(image);
      }
    }

    for (const key of ["cover_photo", "coverPhoto", "photos", "images"]) {
      collectImageUrls(value[key], urls);
    }
  }
}

function extractCoordinates(raw: UnknownRecord): { lat: number; lng: number } | null {
  const location = isRecord(raw.location) ? raw.location : {};
  const geography = isRecord(raw.geography) ? raw.geography : {};
  const coordinateCandidates = [
    raw.coordinates,
    location.coordinates,
    geography.coordinates,
    raw._geoloc,
  ];

  for (const candidate of coordinateCandidates) {
    const parsed = parseCoordinateCandidate(candidate);
    if (parsed) {
      return parsed;
    }
  }

  const lat = firstNumber(raw, ["lat", "latitude"]) ?? firstNumber(location, ["lat", "latitude"]) ?? firstNumber(geography, ["lat", "latitude"]);
  const lng = firstNumber(raw, ["lng", "lon", "longitude"]) ?? firstNumber(location, ["lng", "lon", "longitude"]) ?? firstNumber(geography, ["lng", "lon", "longitude"]);

  return toValidCoordinate(lat, lng);

  return null;
}

function parseCoordinateCandidate(candidate: unknown): { lat: number; lng: number } | null {
  if (Array.isArray(candidate) && candidate.length >= 2) {
    const first = toNumber(candidate[0]);
    const second = toNumber(candidate[1]);

    const normalOrder = toValidCoordinate(first, second);
    if (normalOrder) {
      return normalOrder;
    }

    const reversedOrder = toValidCoordinate(second, first);
    if (reversedOrder) {
      return reversedOrder;
    }
  }

  if (isRecord(candidate)) {
    const lat = firstNumber(candidate, ["lat", "latitude"]);
    const lng = firstNumber(candidate, ["lng", "lon", "longitude"]);
    return toValidCoordinate(lat, lng);
  }

  return null;
}

function collectLocationText(raw: UnknownRecord): string {
  const parts: string[] = [];
  const location = raw.location;

  if (typeof location === "string") {
    parts.push(location);
  } else if (Array.isArray(location)) {
    parts.push(location.map(stringifyValue).join(" "));
  } else if (isRecord(location)) {
    parts.push(stringifyValue(location.name));
    parts.push(stringifyValue(location.title));
    parts.push(stringifyValue(location.breadcrumbs));
    parts.push(stringifyValue(location.slug));
  }

  parts.push(stringifyValue(raw.locationNames));
  parts.push(stringifyValue(raw.location_path));

  return parts.filter(Boolean).join(" ");
}

function detectRent(raw: UnknownRecord): boolean {
  const purpose = `${stringifyValue(raw.purpose)} ${stringifyValue(raw.rentFrequency)} ${stringifyValue(raw.completion_status)}`.toLowerCase();
  return purpose.includes("rent") || purpose.includes("yearly") || purpose.includes("monthly");
}

function firstString(record: UnknownRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return cleanText(value);
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return undefined;
}

function localizedString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return cleanText(value);
  }

  if (!isRecord(value)) {
    return undefined;
  }

  for (const key of ["en", "name", "title", "text"]) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return cleanText(candidate);
    }
  }

  return undefined;
}

function firstNumber(record: UnknownRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = toNumber(record[key]);
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function toValidCoordinate(lat: number | undefined, lng: number | undefined): { lat: number; lng: number } | null {
  if (typeof lat === "number" && typeof lng === "number" && lat > 20 && lat < 30 && lng > 50 && lng < 60) {
    return { lat, lng };
  }

  return null;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringifyValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(stringifyValue).join(" ");
  }

  if (isRecord(value)) {
    return Object.values(value).map(stringifyValue).join(" ");
  }

  return "";
}

function cleanText(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function matchesAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}
