// @ts-check
import { execSync } from "node:child_process";
import type { NextConfig } from "next";

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});
const HawkWebpackPlugin = require("@hawk.so/webpack-plugin");

function readGitCommitHash() {
  return execSync("git rev-parse HEAD", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

const hawkRelease = readGitCommitHash();
const hawkIntegrationToken = process.env.NEXT_PUBLIC_HAWK_INTEGRATION_TOKEN;
interface WebpackConfigShape {
  devtool?: string;
  plugins?: unknown[];
}

const nextConfig: NextConfig = withBundleAnalyzer({
  output: "standalone",
  productionBrowserSourceMaps: true,
  env: {
    NEXT_PUBLIC_HAWK_RELEASE: hawkRelease ?? undefined,
    NEXT_PUBLIC_HAWK_INTEGRATION_TOKEN: hawkIntegrationToken,
  },
  webpack: (
    config: WebpackConfigShape,
    { dev, isServer }: { dev: boolean; isServer: boolean },
  ) => {
    if (!dev && !isServer && hawkIntegrationToken && hawkRelease) {
      config.devtool = "source-map";
      config.plugins = config.plugins ?? [];
      config.plugins.push(
        new HawkWebpackPlugin({
          integrationToken: hawkIntegrationToken,
          release: hawkRelease,
          releaseInfoFile: false,
          commits: {
            repo: __dirname,
          },
        }),
      );
    }

    return config;
  },
});

export default nextConfig;
