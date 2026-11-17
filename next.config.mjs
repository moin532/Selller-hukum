/** @type {import('next').NextConfig} */
const prodApi =
  (process.env.HUKUM_API_URL || process.env.NEXT_PUBLIC_API_URL || "https://api.hukum-ksa.com")
    .trim()
    .replace(/\/$/, "") || "https://api.hukum-ksa.com";

/**
 * Cloudhost / any host without nginx /api proxy:
 * browser calls same-origin `/api/*`, Next rewrites to production Hukum API.
 * On seller.hukum-ksa.com nginx already proxies /api → Backend (rewrite unused).
 */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${prodApi}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
