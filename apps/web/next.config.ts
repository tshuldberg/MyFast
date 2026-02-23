import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@myfast/shared', '@myfast/ui'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // sql.js needs these Node.js modules excluded from the client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
