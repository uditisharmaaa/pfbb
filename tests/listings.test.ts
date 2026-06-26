import { describe, expect, it } from "vitest";
import { normalizeBayutProperty } from "../lib/listings/normalize";

describe("normalizeBayutProperty", () => {
  it("maps a Bayut-like result into the internal property shape", () => {
    const property = normalizeBayutProperty({
      id: "123",
      title: "Modern 3 Bedroom Apartment near Burj Khalifa",
      description: "Family-friendly home in Downtown Dubai with pool, gym and Burj view.",
      price: 5_800_000,
      rooms: 3,
      baths: 4,
      area: 1900,
      purpose: "for-sale",
      location: {
        name: "Downtown Dubai",
        coordinates: { lat: 25.1972, lng: 55.2744 },
      },
      category: { name: "apartments" },
      amenities: [{ name: "Pool" }, { name: "Gym" }],
      agent: {
        name: "Agent Name",
        phone: "+971 50 123 0000",
        contact: { whatsapp: "971501230000" },
      },
      agency: { name: "Agency Name" },
      coverPhoto: { url: "https://example.com/image.jpg" },
    });

    expect(property).not.toBeNull();
    expect(property?.area).toBe("Downtown Dubai");
    expect(property?.type).toBe("apartment");
    expect(property?.style).toBe("luxury");
    expect(property?.lat).toBe(25.1972);
    expect(property?.lng).toBe(55.2744);
    expect(property?.broker.whatsapp).toBe("971501230000");
  });

  it("drops listings outside the demo areas", () => {
    const property = normalizeBayutProperty({
      title: "Dubai Marina Apartment",
      price: 2_000_000,
      location: {
        name: "Dubai Marina",
        coordinates: { lat: 25.08, lng: 55.14 },
      },
    });

    expect(property).toBeNull();
  });
});
