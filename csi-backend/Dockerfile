# 1. Build Stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependencies first for caching
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build

# 2. Production Stage
FROM node:18-alpine

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built assets from builder
COPY --from=builder /app/dist ./dist
# Copy assets/templates if needed (e.g. email templates, images)
COPY --from=builder /app/assets ./assets
# Copy uploads folder structure (optional, but good practice to have the dir)
COPY --from=builder /app/uploads ./uploads

# Expose port (Documentation only, real port is ENV)
EXPOSE 3000

# Start command
CMD ["node", "dist/main"]
