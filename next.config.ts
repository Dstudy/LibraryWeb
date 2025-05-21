import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // The turbo option has been updated in Next.js 15.2.3
    // It now expects an object instead of a boolean
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Add output configuration to handle chunk loading
  output: 'standalone',
  // Configure webpack to handle chunk loading errors
  webpack: (config) => {
    // Optimize chunks
    config.optimization.chunkIds = 'deterministic';
    return config;
  },
};

export default nextConfig;
