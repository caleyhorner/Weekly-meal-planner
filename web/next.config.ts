import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page reads the household session and live data, so the app renders
  // dynamically. Cache Components is left off to keep the data flow simple.
  cacheComponents: false,
  experimental: {
    serverActions: {
      // Recipe photos are resized in the browser to ~1568px JPEGs (a few hundred KB
      // each) before upload. Vercel caps function request bodies at 4.5MB.
      bodySizeLimit: "4mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
