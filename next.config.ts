import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output is only for the Docker image (set NEXT_STANDALONE=true there).
  // Locally it breaks `next start`, so default to the normal server output.
  output: process.env.NEXT_STANDALONE === "true" ? "standalone" : undefined,
  // Keep server-only heavy deps out of the client/edge bundles.
  serverExternalPackages: ["bullmq", "ioredis", "@qdrant/js-client-rest", "bcryptjs"],
  experimental: {
    // Server Actions are GA in 15, but we keep the body size bound for uploads.
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  images: {
    remotePatterns: [
      // Avatars / product images may be remote (e.g. Google profile photos).
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
