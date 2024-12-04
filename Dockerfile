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
RUN npm install -g tsx

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
COPY --from=builder /app ./

# Copy SSL certificates
COPY certificates/ /etc/ssl/certs/cloudchat

# Ensure certificates are redable and secure
RUN chmod -R 600 /etc/ssl/certs/cloudchat

# Start the application as the root user
USER root

# Create and set up the start.sh script
COPY deploy/start.sh /usr/src/app/start.sh
RUN chmod +x /usr/src/app/start.sh

# Expose the application port
EXPOSE 3000

# Start the application using the scripts
CMD ["/usr/src/app/start.sh"]