import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // 如果仍然需要 ESLint 检查但您想继续尽管有错误，请设置为 true
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.plugins.push(
        new ForkTsCheckerWebpackPlugin({
          async: true, // Run type checking synchronously to block the build
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

export default nextConfig;
