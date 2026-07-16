import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
  },
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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
