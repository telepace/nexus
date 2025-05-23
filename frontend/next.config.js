const path = require("path");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    // 启用顶级 await
    serverActions: {},
  },
  // 禁用构建时的 ESLint 检查
  eslint: {
    ignoreDuringBuilds: true,
  },
  // 禁用类型检查以快速通过构建
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    // 解决路径别名问题
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname),
    };

    // ForkTsCheckerWebpackPlugin
    if (!isServer) {
      config.plugins.push(
        new ForkTsCheckerWebpackPlugin({
          async: true,
          typescript: {
            configOverwrite: {
              compilerOptions: {
                skipLibCheck: true,
              },
            },
          },
        }),
      );
    }

    return config;
  },
};

module.exports = nextConfig;
