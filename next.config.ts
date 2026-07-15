import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "@prisma/adapter-pg"],
  outputFileTracingIncludes: {
    "/api/download/companion": ["./companion/dist/splitmeta-companion.zip"],
  },
};

export default nextConfig;
