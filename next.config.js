/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['storage.googleapis.com', 'locodomo.com', 'oaidalleapiprodscus.blob.core.windows.net'],
    unoptimized: true
  },
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  webpack: (config, { isServer }) => {
    // This will make Webpack ignore the canvas module
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false
    };

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        module: false,
        path: false,
      };
    }

    return config;
  }
};

module.exports = nextConfig;
