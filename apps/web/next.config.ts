import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@myfast/shared', '@myfast/ui'],
};

export default nextConfig;
