"use client";

import { useState } from "react";
import { LandingHero, type LandingLaunch } from "./LandingHero";
import PropertyFinderDashboard from "./PropertyFinderDashboard";

export default function PropertyFinderExperience() {
  const [launched, setLaunched] = useState(false);
  const [launchData, setLaunchData] = useState<LandingLaunch | null>(null);

  const handleLaunch = (payload: LandingLaunch) => {
    setLaunchData(payload);
    setLaunched(true);
  };

  if (!launched) {
    return <LandingHero onLaunch={handleLaunch} />;
  }

  return (
    <div className="animate-[fadeIn_0.45s_ease-out]">
      <PropertyFinderDashboard
        initialLifestyle={launchData?.lifestyle ?? ""}
        autoRunBestMatch
      />
    </div>
  );
}
