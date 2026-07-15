import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "@prisma/adapter-pg", "archiver"],
  outputFileTracingIncludes: {
    "/api/download/companion": [
      "./companion/package.json",
      "./companion/package-lock.json",
      "./companion/README.md",
      "./companion/install.bat",
      "./companion/Setup.bat",
      "./companion/SplitMeta.vbs",
      "./companion/START.bat",
      "./companion/assets/**/*",
      "./companion/src/**/*",
      "./companion/electron/**/*",
      "./companion/ui/**/*",
    ],
  },
};

export default nextConfig;
