/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['@zynlo/ui', '@zynlo/supabase', '@zynlo/utils'],
  experimental: {
    externalDir: true, // ✅ Important in monorepos
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable static optimization for problematic pages
  generateBuildId: async () => {
    return 'build-' + Date.now();
  },
  // Add headers to suppress external resource errors
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "img-src 'self' data: https: blob:; connect-src 'self' https: wss: ws:; default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:;",
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

module.exports = nextConfig;
