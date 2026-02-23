import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async redirects() {
    return [
      {
        source: "/atelier/:path*",
        destination: "https://atelier.flaio.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
