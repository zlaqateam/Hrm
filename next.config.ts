import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // "standalone" makes Docker / VPS / any Node host deployment easy.
  output: 'standalone',
};

export default nextConfig;
