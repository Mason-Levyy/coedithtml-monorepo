import type { Metadata } from "next";
import { SITE_URL } from "@/lib/links";

const SOCIAL_IMAGE = {
  url: `${SITE_URL}/opengraph-image.png`,
  width: 1200,
  height: 630,
  alt: "coeditHTML: send the file, not a screenshot. Upload one HTML file and get a link people can comment on and edit in their browser.",
};

type PageFacts = {
  title: string;
  description: string;
  path: string;
};

export function pageMetadata({
  title,
  description,
  path,
}: PageFacts): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      siteName: "coeditHTML",
      locale: "en_US",
      url: `${SITE_URL}${path}`,
      title: `${title} · coeditHTML`,
      description,
      images: [SOCIAL_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · coeditHTML`,
      description,
      images: [SOCIAL_IMAGE],
    },
  };
}
