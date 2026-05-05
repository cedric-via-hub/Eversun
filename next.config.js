/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.88.17'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig;
