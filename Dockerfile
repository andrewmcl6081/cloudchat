# Use Node.js as base image
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy Prisma schema and generate client
COPY prisma ./prisma/

ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}
RUN npx prisma generate

# Copy app files
COPY . .

# Expose the default Remix port
EXPOSE ${PORT}

# Start the app
CMD ["sh", "-c", "npx prisma migrate deploy && npm run dev"]
