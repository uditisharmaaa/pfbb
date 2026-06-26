"use client";

import { Bath, BedDouble, MapPin, Maximize2, MessageCircle } from "lucide-react";
import Image from "next/image";
import type { Property } from "../lib/types";

interface PropertyCardProps {
  property: Property;
  isSelected: boolean;
  onSelect: () => void;
}

export function PropertyCard({ property, isSelected, onSelect }: PropertyCardProps) {
  const image = property.images[0] || "/background.png";
  const price = property.priceAED.toLocaleString("en-AE");
  const whatsappText = encodeURIComponent(`Hi, I'm interested in ${property.title}`);
  const whatsappUrl = `https://wa.me/${property.broker.whatsapp}?text=${whatsappText}`;

  return (
    <article
      className={[
        "group overflow-hidden rounded-lg border bg-[#171511]/84 transition duration-200",
        isSelected ? "border-[#d9b45d] shadow-[0_0_0_1px_rgba(217,180,93,0.35)]" : "border-white/10 hover:border-[#97c9b7]/70",
      ].join(" ")}
    >
      <button type="button" onClick={onSelect} className="grid w-full grid-cols-[128px_1fr] text-left outline-none sm:grid-cols-[158px_1fr]">
        <div className="relative h-full min-h-[176px] overflow-hidden">
          <Image
            src={image}
            alt=""
            fill
            sizes="(max-width: 640px) 128px, 158px"
            className="object-cover transition duration-500 group-hover:scale-105"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute bottom-3 left-3 rounded-full bg-[#11100e]/75 px-2.5 py-1 text-xs capitalize text-[#f4eee4] backdrop-blur-md">
            {property.source === "bayut" ? "Bayut" : "Seed"}
          </div>
        </div>

        <div className="relative min-w-0 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs text-[#97c9b7]">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {property.area}
              </p>
              <h3 className="mt-1 line-clamp-2 text-lg font-semibold leading-snug text-[#f4eee4]">
                {property.title}
              </h3>
            </div>
            <p className="shrink-0 text-right text-sm font-semibold text-[#d9b45d]">
              AED {price}
            </p>
          </div>

          <p className="mt-2 line-clamp-2 text-sm leading-5 text-[#f4eee4]/67">{property.description}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#f4eee4]/74">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1">
              <BedDouble className="h-3.5 w-3.5" aria-hidden />
              {property.bedrooms} bed
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1">
              <Bath className="h-3.5 w-3.5" aria-hidden />
              {property.bathrooms} bath
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1">
              <Maximize2 className="h-3.5 w-3.5" aria-hidden />
              {property.sizeSqft.toLocaleString("en-AE")} sqft
            </span>
            <span className="rounded-full border border-white/10 px-2 py-1 capitalize">{property.style}</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {property.amenities.slice(0, 4).map((amenity) => (
              <span key={amenity} className="rounded-sm bg-white/[0.06] px-2 py-1 text-xs text-[#f4eee4]/64">
                {amenity}
              </span>
            ))}
          </div>
        </div>
      </button>

      <div className="max-h-0 overflow-hidden border-t border-white/0 bg-[#11100e]/82 transition-all duration-300 group-hover:max-h-28 group-hover:border-white/10 group-focus-within:max-h-28 group-focus-within:border-white/10">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#f4eee4]">{property.broker.name}</p>
            <p className="truncate text-xs text-[#f4eee4]/58">
              {property.broker.agency} · {property.broker.phone}
            </p>
          </div>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#97c9b7] px-4 text-sm font-semibold text-[#11100e] transition hover:bg-[#b3dfcf] focus:outline-none focus:ring-2 focus:ring-[#d9b45d]"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            WhatsApp
          </a>
        </div>
      </div>
    </article>
  );
}
