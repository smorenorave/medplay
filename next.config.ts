import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 👇 Habilita la recuperación cuando falla la carga de un chunk
  experimental: {
    clientChunkErrorRecovery: true,
  },

  // 👇 OPCIONAL: ajustar el nombre de los chunks para que sean más predecibles
  webpack: (config) => {
    if (config.output) {
      config.output.chunkFilename = "static/chunks/[name].[contenthash].js";
    }
    return config;
  },
};

export default nextConfig;
