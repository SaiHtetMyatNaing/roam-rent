import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'jqjmzqcgunzqjneltoou.supabase.co',  // From dashboard > Settings > API
      },
    ],
  },
};

export default nextConfig;
