import { PropertyFinderApp } from "../components/PropertyFinderApp";
import { DEFAULT_PREFERENCES } from "../lib/preferences";
import { SEED_PROPERTIES } from "../lib/properties";
import { rankProperties } from "../lib/rank";

export default function Page() {
  const initialProperties = rankProperties(SEED_PROPERTIES, DEFAULT_PREFERENCES);

  return <PropertyFinderApp initialPreferences={DEFAULT_PREFERENCES} initialProperties={initialProperties} />;
}
