"use client";

import { useEffect, useRef, useState } from "react";
import { LOCAL_TOUR_URL, TOUR_URL, isLocalHostname } from "@/lib/links";

export function TourLauncher() {
  const [heldBack, setHeldBack] = useState(false);
  const decided = useRef(false);

  useEffect(() => {
    if (decided.current) {
      return;
    }
    decided.current = true;
    if (isLocalHostname(window.location.hostname)) {
      setHeldBack(true);
      return;
    }
    window.location.replace(TOUR_URL);
  }, []);

  return (
    <div className="launch">
      <a className="btn" href={heldBack ? LOCAL_TOUR_URL : TOUR_URL}>
        Start the tutorial
      </a>
    </div>
  );
}
