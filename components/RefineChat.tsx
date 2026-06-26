"use client";

import { Loader2, Send, SlidersHorizontal } from "lucide-react";
import { FormEvent, useState } from "react";
import type { Preferences } from "../lib/types";

interface RefineChatProps {
  preferences: Preferences;
  isRefining: boolean;
  isLoadingProperties: boolean;
  onSubmit: (message: string) => Promise<void>;
  onCountChange: (count: number) => void;
}

const counts = [3, 5, 8];

export function RefineChat({ preferences, isRefining, isLoadingProperties, onSubmit, onCountChange }: RefineChatProps) {
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();

    if (!trimmed || isRefining) {
      return;
    }

    setMessage("");
    await onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-white/10 bg-[#11100e]/88 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[#f4eee4]/58">
          <SlidersHorizontal className="h-4 w-4 text-[#d9b45d]" aria-hidden />
          {preferences.areas.length > 0 ? preferences.areas.join(", ") : "Dubai"} · {preferences.intent}
        </div>
        <div className="flex overflow-hidden rounded-full border border-white/10">
          {counts.map((count) => (
            <button
              type="button"
              key={count}
              onClick={() => onCountChange(count)}
              className={[
                "h-8 px-3 text-xs font-semibold transition",
                preferences.count === count ? "bg-[#f4eee4] text-[#11100e]" : "text-[#f4eee4]/64 hover:bg-white/10",
              ].join(" ")}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-end gap-2 rounded-lg border border-white/12 bg-[#1e1b16]/92 p-2 transition focus-within:border-[#97c9b7]">
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={1}
          placeholder="3-bed near Burj Khalifa, modern, good for a family"
          className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-2 text-sm leading-6 text-[#f4eee4] outline-none placeholder:text-[#f4eee4]/38"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button
          type="submit"
          disabled={!message.trim() || isRefining}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#c66b3d] text-[#11100e] transition hover:bg-[#e1844d] disabled:cursor-not-allowed disabled:opacity-45"
          aria-label="Send refine message"
        >
          {isRefining || isLoadingProperties ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
        </button>
      </div>
    </form>
  );
}
