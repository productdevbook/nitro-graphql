# Build stage
FROM node:24-alpine AS builder

# Build arguments
ARG NITRO_PRESET=node-server

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application with specified preset
ENV NITRO_PRESET=$NITRO_PRESET
RUN pnpm build

# Production stage
FROM node:24-alpine

WORKDIR /app

# Copy built output from builder
COPY --from=builder /app/.output /app/.output

# Expose the port Nitro uses
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV NITRO_PORT=3000
ENV NITRO_HOST=0.0.0.0

# Start the Nitro server
CMD ["node", ".output/server/index.mjs"]
