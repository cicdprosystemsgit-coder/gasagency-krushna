import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const securityHeaders = [
  { key: "X-Frame-Options",           value: "DENY" },
  { key: "X-Content-Type-Options",    value: "nosniff" },
  { key: "X-DNS-Prefetch-Control",    value: "on" },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://translate.google.com https://translate.googleapis.com https://translate-pa.googleapis.com https://www.gstatic.com https://maps.googleapis.com https://maps.gstatic.com",
      "script-src-elem 'self' 'unsafe-inline' blob: https://translate.google.com https://translate.googleapis.com https://translate-pa.googleapis.com https://www.gstatic.com https://maps.googleapis.com https://maps.gstatic.com",
      "worker-src 'self' blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://translate.googleapis.com https://www.gstatic.com",
      "font-src 'self' https://fonts.gstatic.com https://translate.googleapis.com https://www.gstatic.com",
      "img-src 'self' data: blob: https://translate.googleapis.com https://www.gstatic.com https://maps.googleapis.com https://maps.gstatic.com *.googleapis.com",
      "connect-src 'self' https://translate.googleapis.com https://translate-pa.googleapis.com https://www.gstatic.com https://maps.googleapis.com https://maps.gstatic.com *.googleapis.com",
      "frame-src https://translate.googleapis.com",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["lucide-react"],
  experimental: {
    webpackBuildWorker: false,
  },
  async headers() {
    if (process.env.NODE_ENV !== "production") {
      return [];
    }
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);


