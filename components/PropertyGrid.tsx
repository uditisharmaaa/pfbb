"use client";

import type { Property } from "../lib/types";
import { PropertyCard } from "./PropertyCard";

interface PropertyGridProps {
  properties: Property[];
  selectedId?: string;
  isRefreshing: boolean;
  onSelect: (id: string) => void;
}

export function PropertyGrid({ properties, selectedId, isRefreshing, onSelect }: PropertyGridProps) {
  return (
    <div className="fine-scrollbar relative flex-1 overflow-y-auto px-4 py-4">
      {isRefreshing ? (
        <div className="pointer-events-none absolute left-4 right-4 top-4 z-10 h-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/3 animate-[slide_1.1s_ease-in-out_infinite] rounded-full bg-[#97c9b7]" />
        </div>
      ) : null}

      <div className="grid gap-3">
        {properties.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            isSelected={property.id === selectedId}
            onSelect={() => onSelect(property.id)}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes slide {
          0% {
            transform: translateX(-120%);
          }
          100% {
            transform: translateX(360%);
          }
        }
      `}</style>
    </div>
  );
}
