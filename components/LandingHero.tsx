"use client";

import { useRef, useState } from "react";
import { ArrowUp, Clock3, Home } from "lucide-react";

export type LandingLaunch = {
  lifestyle: string;
};

const PREWRITTEN_PROMPT =
  "I work at Hub71 in Abu Dhabi and my kids go to ISC Khalifa (SABIS). We have 3 kids and need a home close to both work and school.";

export function LandingHero({ onLaunch }: { onLaunch: (payload: LandingLaunch) => void }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const launch = (text: string) => {
    const lifestyle = text.trim();
    if (!lifestyle) return;
    onLaunch({ lifestyle });
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#131314] text-[#e3e3e3]">
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-center opacity-60"
        style={{ backgroundImage: "url(/background.png)" }}
      />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_45%,rgba(60,80,140,0.18),transparent_70%),rgba(19,19,20,0.72)]" />

      <nav className="relative z-10 flex w-[52px] min-w-[52px] flex-col items-center py-3">
        <div className="text-[#e3e3e3]">
          <Home className="mx-auto mb-3 h-7 w-7" strokeWidth={1.5} />
        </div>
        <div className="mt-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-sm font-semibold text-white">
          H
        </div>
      </nav>

      <main className="relative z-10 flex flex-1 flex-col">
        <div className="absolute right-5 top-4 text-[#8e8e8e]">
          <Clock3 className="h-5 w-5" strokeWidth={1.5} strokeDasharray="3 3" />
        </div>

        <section className="flex flex-1 flex-col items-center justify-center px-6 pb-16 pt-20">
          <h1 className="text-center text-[clamp(28px,4vw,42px)] font-normal tracking-[-0.02em] text-[#e3e3e3]">
            Property Finder but Better
          </h1>

          <div className="mt-9 w-full max-w-[720px]">
            <div className="flex items-center gap-2 rounded-[28px] bg-[#1e1f20] p-1.5 pl-1.5 transition focus-within:bg-[#282a2c]">
              <textarea
                ref={inputRef}
                rows={1}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    launch(query);
                  }
                }}
                placeholder="Let us get you your dream home"
                autoFocus
                className="max-h-[200px] min-h-[24px] flex-1 resize-none border-none bg-transparent px-4 py-2.5 text-base text-[#e3e3e3] outline-none placeholder:text-[#8e8e8e]"
              />
              <button
                type="button"
                onClick={() => launch(query)}
                className={`mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${
                  query.trim()
                    ? "bg-white text-[#131314] hover:bg-[#e3e3e3]"
                    : "pointer-events-none opacity-0"
                }`}
                aria-label="Search"
              >
                <ArrowUp className="h-[18px] w-[18px]" />
              </button>
            </div>

            <div className="mt-3.5 flex justify-center">
              <button
                type="button"
                onClick={() => launch(PREWRITTEN_PROMPT)}
                className="rounded-[20px] border border-white/10 bg-[rgba(30,31,32,0.75)] px-[18px] py-2.5 text-sm text-[#e3e3e3] transition hover:border-white/[0.18] hover:bg-[rgba(40,42,44,0.9)]"
              >
                Pre-written prompt
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
