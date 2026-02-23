import type { NextConfig } from "next";
import { execSync } from "child_process";

const gitHash = (() => {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "unknown";
  }
})();

const nextConfig: NextConfig = {
  devIndicators: false,
  env: {
    NEXT_PUBLIC_GIT_HASH: gitHash,
  },
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
