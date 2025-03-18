/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    turbo: {
      resolveAlias: {
        'util/types': 'util/support/types'
      }
    }
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'reko-employee-selfie.s3.us-east-1.amazonaws.com',
      },
    ]
  }
};

export default nextConfig;
