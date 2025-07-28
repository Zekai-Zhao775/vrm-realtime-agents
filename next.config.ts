import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // ⚠️ This will ignore TypeScript errors during build
    ignoreBuildErrors: true,
  },
  eslint: {
    // ⚠️ This will ignore ESLint errors during build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
