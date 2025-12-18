const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})
// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = withBundleAnalyzer({
  output: "standalone",
  serverExternalPackages: ["@libsql/client", "@prisma/adapter-libsql"],
});

module.exports = nextConfig;
