# Stage 1: Dependencies
FROM node:20-bookworm as deps

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:20-bookworm as builder

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the Next.js application
RUN pnpm build

# Stage 3: Production
FROM node:20-bookworm-slim as runner

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Set environment to production
ENV NODE_ENV=production

# Copy necessary files for production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/start.sh ./start.sh
COPY --from=builder /app/watcher.js ./watcher.js

# Make scripts executable
RUN chmod +x start.sh watcher.js

# Use non-root user for better security
RUN chown -R node:node /app
USER node

EXPOSE 3000

# Update the start script to use production mode
CMD ["./start.sh"]