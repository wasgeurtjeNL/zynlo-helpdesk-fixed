const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['@zynlo/ui', '@zynlo/supabase', '@zynlo/utils'],
  experimental: {
    externalDir: true, // ✅ Important in monorepos
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Force standalone output for better Vercel compatibility
  output: 'standalone',
};

module.exports = nextConfig;
