"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { PropertyGrid } from "./PropertyGrid";
import { RefineChat } from "./RefineChat";
import type { Preferences, Property, PropertySearchResult } from "../lib/types";

const PropertyGlobe = dynamic(() => import("./PropertyGlobe").then((module) => module.PropertyGlobe), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[420px] items-center justify-center bg-[rgba(10,10,9,0.55)] text-sm text-[#f4eee4]/70">
      Loading Dubai 3D view
    </div>
  ),
});

interface PropertyFinderAppProps {
  initialPreferences: Preferences;
  initialProperties: Property[];
}

export function PropertyFinderApp({ initialPreferences, initialProperties }: PropertyFinderAppProps) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [properties, setProperties] = useState(initialProperties);
  const [selectedId, setSelectedId] = useState(initialProperties[0]?.id ?? "");
  const [source, setSource] = useState<PropertySearchResult["source"]>("seed");
  const [providerNote, setProviderNote] = useState<string | undefined>();
  const [isLoadingProperties, setIsLoadingProperties] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [, startTransition] = useTransition();

  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === selectedId) || properties[0],
    [properties, selectedId],
  );

  const fetchProperties = useCallback(async (nextPreferences: Preferences, signal?: AbortSignal) => {
    setIsLoadingProperties(true);

    try {
      const response = await fetch(`/api/properties?preferences=${encodeURIComponent(JSON.stringify(nextPreferences))}`, {
        signal,
      });

      if (!response.ok) {
        throw new Error(`Properties API ${response.status}`);
      }

      const result = (await response.json()) as PropertySearchResult;

      if (result.properties.length > 0) {
        startTransition(() => {
          setProperties(result.properties);
          setSource(result.source);
          setProviderNote(result.reason);
          setSelectedId((current) => (result.properties.some((property) => property.id === current) ? current : result.properties[0].id));
        });
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setProviderNote("Live listings are unavailable; showing seeded Dubai comps.");
      }
    } finally {
      setIsLoadingProperties(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchProperties(preferences, controller.signal);
    return () => controller.abort();
  }, [fetchProperties, preferences]);

  const handleRefine = useCallback(
    async (message: string) => {
      setIsRefining(true);

      try {
        const response = await fetch("/api/refine", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ preferences, message }),
        });

        if (!response.ok) {
          throw new Error(`Refine API ${response.status}`);
        }

        const data = (await response.json()) as { preferences: Preferences };
        setPreferences(data.preferences);
      } catch {
        setProviderNote("Refine is unavailable; keeping the current preferences.");
      } finally {
        setIsRefining(false);
      }
    },
    [preferences],
  );

  const handleCountChange = useCallback((count: number) => {
    setPreferences((current) => ({ ...current, count }));
  }, []);

  return (
    <main className="min-h-screen px-4 py-4 text-[#f4eee4] md:px-6 md:py-6">
      <div className="mx-auto grid min-h-[calc(100vh-32px)] max-w-[1600px] gap-4 lg:grid-cols-[minmax(420px,560px)_1fr]">
        <section className="glass-panel flex min-h-[680px] flex-col overflow-hidden rounded-lg shadow-property-card">
          <div className="border-b border-white/10 px-5 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#97c9b7]">Dubai results</p>
                <h1 className="mt-2 text-3xl font-semibold leading-tight text-[#f4eee4]">
                  Property Finder But Better
                </h1>
              </div>
              <div className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.16em] text-[#f4eee4]/70">
                {source === "bayut" ? "Live" : "Demo"}
              </div>
            </div>
            <p className="mt-3 max-w-[44rem] text-sm leading-6 text-[#f4eee4]/68">
              Results first. Refine after. Downtown Dubai and Jumeirah listings stay mapped to the 3D view.
            </p>
            {providerNote ? <p className="mt-2 text-xs text-[#d9b45d]">{providerNote}</p> : null}
          </div>

          <PropertyGrid
            properties={properties}
            selectedId={selectedProperty?.id}
            isRefreshing={isLoadingProperties}
            onSelect={setSelectedId}
          />

          <RefineChat
            preferences={preferences}
            isRefining={isRefining}
            isLoadingProperties={isLoadingProperties}
            onSubmit={handleRefine}
            onCountChange={handleCountChange}
          />
        </section>

        <section className="relative min-h-[520px] overflow-hidden rounded-lg border border-white/10 bg-[#11100e] shadow-property-card">
          <PropertyGlobe selectedProperty={selectedProperty} />
          {selectedProperty ? (
            <div className="pointer-events-none absolute left-4 top-4 max-w-sm rounded-md border border-white/15 bg-[#11100e]/78 p-4 backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.2em] text-[#d9b45d]">Selected</p>
              <h2 className="mt-1 text-xl font-semibold">{selectedProperty.title}</h2>
              <p className="mt-1 text-sm text-[#f4eee4]/68">
                {selectedProperty.area} · {selectedProperty.bedrooms} bed · {selectedProperty.style}
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
