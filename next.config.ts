import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for @xenova/transformers to work in Next.js Serverless/Edge
  serverExternalPackages: ['@xenova/transformers'],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "sharp$": false,
      "onnxruntime-node$": false,
    }
    return config;
  },
  // Silence the Next 16 Turbopack warning when a webpack config is present
  turbopack: {}
};

export default nextConfig;
