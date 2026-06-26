export type Style =
  | "modern"
  | "minimalist"
  | "classic"
  | "luxury"
  | "industrial"
  | "arabesque";

export type PropType = "apartment" | "penthouse" | "villa" | "townhouse";
export type Area = "Downtown Dubai" | "Jumeirah";

export interface Broker {
  name: string;
  agency: string;
  phone: string;
  whatsapp: string;
}

export interface Property {
  id: string;
  title: string;
  area: Area;
  type: PropType;
  bedrooms: number;
  bathrooms: number;
  sizeSqft: number;
  priceAED: number;
  rentAED?: number;
  style: Style;
  description: string;
  amenities: string[];
  pricePerSqft: number;
  lat: number;
  lng: number;
  cameraHeading?: number;
  images: string[];
  broker: Broker;
  listingUrl?: string;
  source?: "bayut" | "seed";
}

export interface Preferences {
  intent: "buy" | "rent";
  areas: Area[];
  types: PropType[];
  bedrooms?: number;
  budgetMax?: number;
  styles: Style[];
  mustHave: string[];
  dealbreakers: string[];
  count: number;
  notes?: string;
}

export interface PropertySearchResult {
  properties: Property[];
  source: "bayut" | "seed";
  reason?: string;
}
