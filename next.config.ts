import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Azure App Service configuration
  output: 'standalone',
  
  // Optimize for production
  images: {
    unoptimized: true, // For Azure App Service compatibility
  },
  
  // Environment variables configuration
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
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
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
