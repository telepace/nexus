import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  eslint: {
    // 如果仍然需要 ESLint 检查但您想继续尽管有错误，请设置为 true
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 在构建时忽略 TypeScript 错误
    ignoreBuildErrors: true,
  },
  // 修复配置位置
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
  // 临时禁用静态优化，防止预渲染错误
  experimental: {
    forceSwcTransforms: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`, // 代理到后端服务器
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // 允许所有HTTPS域名（开发环境）
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
      {
        protocol: "http",
        hostname: "sm.nsddd.top", // 添加具体的域名
      },
      {
        protocol: "https",
        hostname: "sm.nsddd.top",
      },
      // 添加其他常见的图片托管域名
      {
        protocol: "https",
        hostname: "*.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.cloudfront.net",
      },
      {
        protocol: "https",
        hostname: "*.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "cdn.jsdelivr.net",
      },
      // 添加 Wikimedia 域名支持
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "*.wikimedia.org",
      },
    ],
  },
  // webpack: (config, { isServer }) => {
  //   if (!isServer) {
  //     config.plugins.push(
  //       new ForkTsCheckerWebpackPlugin({
  //         async: true, // Run type checking synchronously to block the build
  //         typescript: {
  //           configOverwrite: {
  //             compilerOptions: {
  //               skipLibCheck: true,
  //             },
  //           },
  //         },
  //       }),
  //     );
  //   }
  //   return config;
  // },
};

export default nextConfig;
