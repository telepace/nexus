# Stage 1: Dependencies
FROM node:20-bookworm AS deps

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:20-bookworm AS builder

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# 添加环境变量以确保构建稳定性
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_SHARP_PATH=/tmp/node_modules/sharp

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files EXCEPT those in .dockerignore
COPY . .

# 确保 .next 目录存在
RUN mkdir -p .next

# Ensure that tsconfig paths are set correctly
RUN cat tsconfig.json

# Make sure the components directory is present
RUN ls -la components

# 进行稳定的生产构建
RUN pnpm build

# 确保生成了.next目录
RUN ls -la .next

# Stage 3: Production
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Set environment to production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Copy necessary files for production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/start.sh ./start.sh
COPY --from=builder /app/watcher.js ./watcher.js
COPY --from=builder /app/next.config.mjs ./next.config.mjs

# Make scripts executable
RUN chmod +x start.sh watcher.js

# Use non-root user for better security
RUN chown -R node:node /app
USER node

EXPOSE 3000

# 修改启动命令，适应standalone输出
CMD ["node", ".next/standalone/server.js"]