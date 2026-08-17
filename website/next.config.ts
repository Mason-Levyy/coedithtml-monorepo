import type { NextConfig } from "next";

// No app logic lives here, so the site exports to static files. That keeps it
// deployable anywhere and keeps a server framework out of the marketing path.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
