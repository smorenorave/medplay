import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite aislar compilaciones de verificación cuando el servidor local usa `.next`.
  distDir: process.env.MEDPLAY_NEXT_DIST_DIR || ".next",
  // 👇 Habilita la recuperación cuando falla la carga de un chunk
  // 👇 OPCIONAL: ajustar el nombre de los chunks para que sean más predecibles
  webpack: (config) => {
    if (config.output) {
      config.output.chunkFilename = "static/chunks/[name].[contenthash].js";
    }
    return config;
  },
};

export default nextConfig;
