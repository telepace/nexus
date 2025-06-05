import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  eslint: {
    // 如果仍然需要 ESLint 检查但您想继续尽管有错误，请设置为 true
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // 允许所有HTTPS域名
      },
      {
        protocol: "http",
        hostname: "**", // 允许所有HTTP域名（开发环境）
      },
    ],
    // 对于无法访问的图片源，不进行优化处理
    unoptimized: false, // 保持默认优化，但在组件层面使用原生 img 标签绕过
    // 可选：也可以使用具体域名列表（更安全）
    // domains: [
    //   'sm.nsddd.top',
    //   'example.com',
    //   'github.com',
    //   'avatars.githubusercontent.com',
    //   'images.unsplash.com',
    //   'cdn.jsdelivr.net',
    // ],
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
