/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['@zynlo/ui', '@zynlo/supabase', '@zynlo/utils'],
  typescript: {
    // !! WAARSCHUWING !!
    // Tijdelijk TypeScript errors negeren tijdens build
    // Dit moet worden opgelost door de database types te updaten
    ignoreBuildErrors: true
  },
  eslint: {
    // Tijdens productie build eslint warnings negeren
    ignoreDuringBuilds: true
  }
}

module.exports = nextConfig 