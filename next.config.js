const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})
// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = withBundleAnalyzer({
  output: "standalone",
  serverExternalPackages: ["@prisma/adapter-neon"],
});

module.exports = nextConfig;
