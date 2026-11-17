/** @type {import('next').NextConfig} */
/**
 * Local /api proxy → Backend on this machine (avoids broken api.hukum-ksa.com DNS).
 * Browser calls https://seller.hukum-ksa.com directly via api-client.js.
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
