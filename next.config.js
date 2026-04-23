/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  typescript: {
    // Désactiver la vérification TypeScript pendant le build en production
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: ['192.168.88.17'],
  // Configuration Turbopack pour éviter les conflits
  turbopack: {},
  // Optimisations de performance
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },
  // Compression
  compress: true,
  // Optimisation des images
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Optimisation du bundle
  webpack: (config, { dev, isServer }) => {
    // Optimisations pour la production
    if (!dev && !isServer) {
      config.optimization.splitChunks.chunks = 'all';
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        // Séparer les bibliothèques lourdes
        recharts: {
          test: /[\\/]node_modules[\\/]recharts[\\/]/,
          name: 'recharts',
          chunks: 'all',
          priority: 10,
        },
        'framer-motion': {
          test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
          name: 'framer-motion',
          chunks: 'all',
          priority: 10,
        },
        'phosphor-icons': {
          test: /[\\/]node_modules[\\/]@phosphor-icons[\\/]/,
          name: 'phosphor-icons',
          chunks: 'all',
          priority: 10,
        },
      };
    }

    return config;
  },
}

module.exports = withBundleAnalyzer(nextConfig);
