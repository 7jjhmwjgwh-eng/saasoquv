import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a minimal server bundle (.next/standalone) for the production
  // Dockerfile — without this, the Docker image would need the full node_modules.
  output: "standalone",
};

export default nextConfig;
