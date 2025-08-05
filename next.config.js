/** @type {import('next').NextConfig} */
const nextConfig = {
  // NO output: 'export' - use regular Next.js deployment for SaaS with server features
  trailingSlash: true,
  images: { 
    unoptimized: false, // Enable Next.js image optimization
    domains: ['localhost'], // Add any external image domains here
  },
  serverExternalPackages: ['@neondatabase/serverless', 'bcryptjs'],
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;