/** @type {import('next').NextConfig} */
import { withSentryConfig } from "@sentry/nextjs";
import fs from "node:fs";
import path from "node:path";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
];

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.example.com",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "@tanstack/react-query"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  webpack(config, { isServer }) {
    if (isServer) {
      config.plugins.push({
        apply(compiler) {
          compiler.hooks.afterEmit.tap("EnsureDashboardPageManifest", () => {
            const serverOutputDir = compiler.options.output.path;
            const manifestPath = path.join(
              serverOutputDir,
              "app",
              "(dashboard)",
              "page_client-reference-manifest.js"
            );

            if (!fs.existsSync(manifestPath)) {
              fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
              fs.writeFileSync(
                manifestPath,
                "self.__RSC_MANIFEST=self.__RSC_MANIFEST||{};\n",
                "utf8"
              );
            }
          });
        },
      });
    }
    return config;
  },
};

const hasSentryConfig =
  !!process.env.SENTRY_AUTH_TOKEN &&
  !!process.env.SENTRY_ORG &&
  !!process.env.SENTRY_PROJECT;

const sentryOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
};

export default hasSentryConfig
  ? withSentryConfig(nextConfig, sentryOptions)
  : nextConfig;
