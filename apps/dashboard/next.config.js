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
    return 'build-' + Date.now()
  },
};

module.exports = nextConfig;
