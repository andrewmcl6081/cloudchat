# Build stage
FROM node:18-alpine as builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source files
COPY . .

# Build the application
ENV NODE_ENV=production
RUN npm run build

# Production stage
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install runtime dependencies
COPY package*.json ./
RUN npm ci --production

# Copy built assets and runtime dependencies from the builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

# Create and set up the start.sh script
RUN echo '#!/bin/sh \
echo "=== Starting application setup ===" && \
echo "Checking DATABASE_URL..." && \
if [ -z "$DATABASE_URL" ]; then \
  echo "ERROR: DATABASE_URL is not set" && \
  exit 1; \
fi && \
echo "Generating Prisma Client..." && \
npx prisma generate && \
echo "Running database migrations..." && \
npx prisma migrate deploy && \
echo "Starting Remix application..." && \
npm run start' > ./start.sh && chmod +x ./start.sh

# Expose the application port
EXPOSE 3000

# Start the application using the script
CMD ["./start.sh"]
