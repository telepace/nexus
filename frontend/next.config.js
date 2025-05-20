/** @type {import('next').NextConfig} */
const path = require("path");

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    // 启用顶级 await
    serverActions: {},
  },
  webpack: (config) => {
    // 解决路径别名问题
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname),
    };

    // 修复CSS加载问题 - 处理@tailwind指令
    const rules = config.module.rules
      .find((rule) => typeof rule.oneOf === "object")
      ?.oneOf.filter(
        (rule) =>
          Array.isArray(rule.use) &&
          rule.use.some(({ loader }) => loader?.includes("css-loader")),
      );

    if (rules && rules.length > 0) {
      rules.forEach((rule) => {
        const cssLoader = rule.use.find(({ loader }) =>
          loader?.includes("css-loader"),
        );
        if (cssLoader) {
          cssLoader.options = {
            ...cssLoader.options,
            url: true,
            import: true,
            modules: {
              auto: true,
              localIdentName: "[hash:base64:8]",
            },
          };
        }
      });
    }

    return config;
  },
};

module.exports = nextConfig;
