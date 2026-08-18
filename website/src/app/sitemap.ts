import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/links";

const PAGES = [
  { path: "/", priority: 1 },
  { path: "/connect/", priority: 0.9 },
  { path: "/auth.md", priority: 0.8 },
  { path: "/llms.txt", priority: 0.8 },
  { path: "/openapi.json", priority: 0.7 },
  { path: "/report/", priority: 0.3 },
  { path: "/privacy/", priority: 0.2 },
  { path: "/terms/", priority: 0.2 },
];

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PAGES.map(({ path, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: "monthly",
    priority,
  }));
}
