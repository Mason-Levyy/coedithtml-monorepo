"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { LOCAL_TOUR_URL, TOUR_URL, isLocalHostname } from "@/lib/links";

type TutorialLinkProps = {
  className?: string;
  children: ReactNode;
};

export function TutorialLink({ className, children }: TutorialLinkProps) {
  const [href, setHref] = useState(TOUR_URL);

  useEffect(() => {
    if (isLocalHostname(window.location.hostname)) {
      setHref(LOCAL_TOUR_URL);
    }
  }, []);

  return (
    <a className={className} href={href}>
      {children}
    </a>
  );
}
