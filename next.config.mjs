/** @type {import('next').NextConfig} */
/**
 * Same-origin /api rewrite → Backend on this machine.
 * Browsers call https://api.hukum-ksa.com via api-client.js.
 */
const nextConfig = {
  async rewrites() {
    const target = (process.env.HUKUM_API_PROXY || "http://127.0.0.1:4000").replace(/\/$/, "");
    return [
      {
        source: "/api/:path*",
        destination: `${target}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
