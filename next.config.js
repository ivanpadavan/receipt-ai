const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})
module.exports = withBundleAnalyzer({
  output: "standalone",
  serverExternalPackages: ['@libsql/client', '@prisma/adapter-libsql'],
  experimental: {
    forceSwcTransforms: true,
  }
})
