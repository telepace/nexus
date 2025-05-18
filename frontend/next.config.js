/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    // 启用顶级 await
    serverActions: true,
  },
  webpack: (config) => {
    // 解决路径别名问题
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": require("path").resolve(__dirname),
    };

    return config;
  },
};

module.exports = nextConfig;
