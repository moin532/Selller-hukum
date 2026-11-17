/** @type {import('next').NextConfig} */
const raw =
  (process.env.HUKUM_API_URL ||
    process.env.NEXT_PUBLIC_HUKUM_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "https://api.hukum-ksa.com")
    .trim()
    .replace(/\/$/, "");

const prodApi =
  !raw || /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(raw)
    ? "https://api.hukum-ksa.com"
    : raw;

/**
 * Optional same-origin /api proxy → production Hukum API.
 * Browser also calls https://api.hukum-ksa.com directly by default.
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
