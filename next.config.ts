import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  webpack(config, { dev }) {
    if (config.cache && !dev) {
      config.cache = Object.freeze({ type: "memory" });
    }
    return config;
  },
};

export default nextConfig;
