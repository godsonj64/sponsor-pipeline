import type { NextConfig } from "next";

/** Applied to every response; cheap hardening for a public deploy. */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // Native module: leave it to node's resolver rather than the bundler.
  serverExternalPackages: ["better-sqlite3"],
  // This project sits inside a folder with other lockfiles; pin the root so the
  // bundler doesn't walk up and pick the wrong one.
  turbopack: { root: __dirname },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
