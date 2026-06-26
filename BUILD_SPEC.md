# Property Finder But Better — Build Spec

Working name, rename freely. A results-first property finder for Dubai. The user describes what they want; the app immediately shows 3 properties (no Q&A wizard), each with a description and a broker contact on hover. Clicking a property flies a 3D camera into its exact location using Google Photorealistic 3D Tiles. The chat box is for *refining* ("too pricey", "different style"), not for interrogating the user.

Demo scope: Dubai only, Downtown (Burj Khalifa area) + Jumeirah. Both have strong Google photorealistic coverage.

---

## Core principle

A normal property app asks questions, then shows results. This shows results first, then lets the user correct them. The chat never blocks the grid. Every user message mutates a persistent `preferences` object, and the grid re-ranks against it. That accumulating preference state is the product; the LLM is just the parser.

---

## Stack

- Next.js (App Router) + TypeScript + pnpm
- Tailwind for styling
- CesiumJS for the 3D globe, pointed at Google Photorealistic 3D Tiles
- Seed data as a static TS file. No database for the demo — ~20–30 hand-built properties across the two areas is plenty and removes all infra setup. (Supabase only if you want persistence later; skip for now.)
- One LLM behind a single API route for parse/refine. You already have chat wired; reuse that model. Do not put both GPT and Claude in the loop — pick one for the refine step.
- Broker contact = seeded fields + a `wa.me` deep link.

---

## Data model

```ts
// lib/types.ts

export type Style = "modern" | "minimalist" | "classic" | "luxury" | "industrial" | "arabesque";
export type PropType = "apartment" | "penthouse" | "villa" | "townhouse";
export type Area = "Downtown Dubai" | "Jumeirah";

export interface Broker {
  name: string;
  agency: string;
  phone: string;       // display, e.g. "+971 50 123 4567"
  whatsapp: string;    // digits only, no +, e.g. "971501234567"
}

export interface Property {
  id: string;
  title: string;
  area: Area;
  type: PropType;
  bedrooms: number;
  bathrooms: number;
  sizeSqft: number;
  priceAED: number;        // sale price
  rentAED?: number;        // annual, optional
  style: Style;
  description: string;     // 1–2 sentences, curated
  amenities: string[];     // ["pool", "gym", "burj view", ...]
  pricePerSqft: number;    // anchor to DLD medians so the number is defensible
  lat: number;
  lng: number;
  cameraHeading?: number;  // optional, for a nicely framed 3D shot
  images: string[];        // 1–3 urls; Unsplash interiors are fine for demo
  broker: Broker;
}

export interface Preferences {
  intent: "buy" | "rent";
  areas: Area[];           // empty = any
  types: PropType[];       // empty = any
  bedrooms?: number;       // desired
  budgetMax?: number;      // AED
  styles: Style[];         // preferred, empty = any
  mustHave: string[];      // amenity tags
  dealbreakers: string[];  // amenity tags or styles to exclude
  count: number;           // how many cards to show, default 3
  notes?: string;          // free text the model wants to keep
}
```

Seed file `lib/properties.ts` exports `Property[]`. Build the two demo hero properties first: one Downtown near Burj Khalifa, one in Jumeirah. Get their real lat/lng right (drop a pin in Google Maps, copy coordinates) so the 3D flyTo lands on the actual building.

---

## Core loop

1. Landing renders N featured properties (Downtown + Jumeirah) before any input. This is what sells "instant, no questions."
2. User types a scenario into the refine box.
3. `POST /api/refine { preferences, message }` → LLM returns an updated `Preferences` JSON.
4. Client runs `rankProperties(allProperties, preferences)` → top `preferences.count`.
5. Grid re-renders. Clicking a card flies the Cesium camera to its lat/lng. Hovering reveals the broker panel with a WhatsApp link.
6. Repeat. Preferences accumulate and mutate across turns.

The clever part is relative edits. "Too pricey" should lower `budgetMax` (e.g. to ~85% of the cheapest currently-shown price). "Don't like the style" should push the currently-shown styles into `dealbreakers` and/or clear `styles`. "More like the second one" should copy that property's style/type/area into preferences. Handle this in the prompt, not in client code.

---

## Ranking

Keep it a pure, deterministic function so you can explain "why these three" on stage.

```ts
// lib/rank.ts
// Hard filters first, then weighted soft score, then sort, then slice(count).

// Hard filters:
//  - intent matches (buy => has priceAED; rent => has rentAED)
//  - if preferences.areas non-empty, property.area must be in it
//  - if budgetMax set, price <= budgetMax * 1.05 (small tolerance)
//  - drop anything whose style is in dealbreakers
//
// Soft score (sum weights):
//  - style in preferences.styles      +3
//  - bedrooms exact match             +2  (off-by-one +1)
//  - type in preferences.types        +2
//  - each mustHave amenity present    +1
//  - price closeness to budgetMax     +0..2 (closer under budget = better)
//
// Tie-break by pricePerSqft ascending. Return top `count`.
```

---

## LLM refine route

```ts
// app/api/refine/route.ts
// Input: { preferences: Preferences, message: string }
// Output: { preferences: Preferences }  // updated, full object

// System prompt (sketch):
// "You maintain a property-search preference object for Dubai (Downtown Dubai
//  and Jumeirah only). Given the CURRENT preferences JSON and a new user
//  message, return the UPDATED preferences JSON and nothing else — no prose,
//  no markdown, no code fences.
//  Rules:
//   - Merge, don't reset. Keep prior fields unless the user contradicts them.
//   - Relative edits: 'too pricey' => set budgetMax to ~85% of the lowest price
//     the user has seen (passed to you as context); 'cheaper' => lower further.
//   - 'don't like the style' / 'different style' => move current styles into
//     dealbreakers and clear styles.
//   - Only ever use the allowed enum values. Areas limited to the two above.
//   - count defaults to 3; honor 'show me 5' etc."
//
// Pass the prices/styles of the currently-shown cards in the user turn so the
// model can resolve relative edits. Parse with a strict JSON parse + zod
// validate; on failure, return preferences unchanged.
```

Use whichever model you already have keyed. Force JSON-only output and validate; never trust the raw string.

---

## Cesium 3D globe (do this slice early — it's the highest-risk piece)

Requires a Google Maps API key with the **Map Tiles API** enabled. Free credit covers a hackathon easily. This is the single most likely thing to eat hours, so de-risk it before the AI work.

```ts
// components/PropertyGlobe.tsx (client component)
// One viewer, reused. globe hidden. fly on prop change.

const viewer = new Cesium.Viewer("cesiumContainer", {
  baseLayerPicker: false,
  geocoder: false,
  homeButton: false,
  sceneModePicker: false,
  timeline: false,
  animation: false,
  requestRenderMode: true,        // perf: only render on change
});
viewer.scene.globe.show = false;  // Google tiles replace the globe

const tileset = await Cesium.Cesium3DTileset.fromUrl(
  `https://tile.googleapis.com/v1/3dtiles/root.json?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}`,
  { showCreditsOnScreen: true }   // attribution is required by the ToS
);
viewer.scene.primitives.add(tileset);

// Fly to a property (call on card click):
function flyTo(lat: number, lng: number, heading = 0) {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lng, lat, 350), // ~350m altitude
    orientation: {
      heading: Cesium.Math.toRadians(heading),
      pitch: Cesium.Math.toRadians(-35),  // angled, not top-down
      roll: 0,
    },
    duration: 2.5,
  });
}
```

Notes: import Cesium dynamically (`next/dynamic`, `ssr: false`) so it never runs on the server. Set `window.CESIUM_BASE_URL` to the static assets path. Add `Cesium.RequestScheduler.requestsByServer["tile.googleapis.com:443"] = 18;` to speed tile loading.

---

## File structure

```
app/
  page.tsx                  // split layout: grid + globe + refine box
  api/refine/route.ts       // LLM parse/refine
components/
  PropertyGrid.tsx
  PropertyCard.tsx          // hover -> broker panel + wa.me link
  PropertyGlobe.tsx         // Cesium, ssr:false
  RefineChat.tsx            // the refine box (reuse your existing chat UI)
lib/
  types.ts
  properties.ts             // seed data
  rank.ts
  prompt.ts                 // system prompt + zod schema
```

Layout: globe as the large background or right pane, grid of cards overlaid/left, refine box docked at the bottom. The grid is the hero on load; the globe takes over visually when a card is clicked.

---

## Broker contact

On card hover, slide in a panel with name, agency, phone, and a WhatsApp button:

```
https://wa.me/<whatsapp_digits>?text=Hi%2C%20I'm%20interested%20in%20<title>
```

That's it — one anchor tag, opens WhatsApp web/app.

---

## Build order (each slice is demoable on its own)

1. Scaffold, Tailwind, seed data, static card grid. Make the results-first grid look good with the two hero properties plus a handful more. No AI, no 3D yet.
2. Cesium globe with Google tiles, hardcoded flyTo a Downtown coordinate. Wire card click → flyTo. Get the wow working and de-risked.
3. Broker hover panel + `wa.me` link.
4. `rank.ts` + the count control. Cards now render from `rank(preferences)` instead of a static slice.
5. `/api/refine` route. Wire the refine box → update preferences → re-rank → re-render. Implement relative edits ("too pricey", "different style").
6. Landing featured state, loading shimmer on refine, card→globe transition polish.
7. Demo script + a hardcoded happy-path fallback in case the live model flakes on stage.

---

## Demo script

1. Open on featured Downtown + Jumeirah cards (no input yet).
2. Type: "3-bed near Burj Khalifa, modern, good for a family." → three cards.
3. Click the Downtown card → camera dives into the Burj Khalifa area in photorealistic 3D.
4. Hover a card → broker panel, tap WhatsApp.
5. Type: "a bit too pricey, show me villas in Jumeirah instead." → grid updates, click → fly to Jumeirah.
6. Optional kill shot: same query in ChatGPT on a second screen. It invents a price; yours shows real DLD-anchored comps and the actual building in 3D.

---

## Risk notes

- **Google tiles key + billing enabled** is the most likely time sink. Slice 2, first thing.
- **Data honesty**: seeded listings, prices anchored to real DLD medians, real coordinates, placeholder brokers. If asked, say exactly that. Don't claim a live feed.
- **JSON discipline**: force JSON-only from the model, zod-validate, fall back to unchanged preferences on parse failure. A malformed refine response should never blank the grid.
- **One model in the loop.** Don't split refine across GPT and Claude.
- **Coverage check**: confirm your two hero coordinates render well in Google tiles before committing to them (some buildings are sharper than others).
