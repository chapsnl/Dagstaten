import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Voorkomt dat Next.js de verkeerde projectmap als root kiest wanneer er
  // toevallig ook een package-lock.json in een hogere map staat (bijv. in de
  // home-map van de gebruiker) - anders worden alle routes niet gevonden.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
