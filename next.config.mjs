/** @type {import('next').NextConfig} */
import { withSentryConfig } from "@sentry/nextjs";
import fs from "node:fs";
import path from "node:path";

const isProd = process.env.NODE_ENV === "production";

// In production, try without unsafe-eval (Next.js 14 may not need it).
// In development, unsafe-eval is required for hot reload.
const scriptSrc = isProd
  ? "'self' 'unsafe-inline'"
  : "'self' 'unsafe-inline' 'unsafe-eval'";

const cspValue = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

// Report-only CSP: stricter policy for monitoring (logs violations without blocking)
const cspReportOnly = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

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
  { key: "Content-Security-Policy", value: cspValue },
  { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
];

const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
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
