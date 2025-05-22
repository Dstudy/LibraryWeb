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

    // Improve chunk loading reliability
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        default: false,
        vendors: false,
        // Vendor chunk for third-party libraries
        vendor: {
          name: 'vendor',
          chunks: 'all',
          test: /node_modules/,
          priority: 20,
        },
        // Common chunk for shared code
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          priority: 10,
          reuseExistingChunk: true,
          enforce: true,
        },
      },
    };

    return config;
  },
};

export default nextConfig;
