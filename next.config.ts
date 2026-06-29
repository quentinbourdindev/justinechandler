import type { NextConfig } from "next";

/**
 * Configuration Next.js.
 * - `output: "standalone"` : build autonome pour l'image Docker (Phase 6),
 *   copie uniquement les dépendances nécessaires dans `.next/standalone`.
 * - `serverExternalPackages` : `postgres` (postgres.js) ne doit pas être
 *   bundlé par Next côté serveur (driver natif TCP).
 */
const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  serverExternalPackages: ["postgres", "bcryptjs"],
  poweredByHeader: false,
};

export default nextConfig;
