FROM node:20-bookworm

# Set the working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files and install dependencies
COPY package*.json ./

# Install dependencies as root (or myappuser, depending on your structure)
RUN pnpm install

# Copy the rest of your application code
COPY . .

# Make start.sh executable
RUN chmod +x start.sh

# Ensure watcher.js is executable
RUN chmod +x watcher.js

# Use non-root user for security
USER node

EXPOSE 3000

# Start the application
CMD ["./start.sh"]