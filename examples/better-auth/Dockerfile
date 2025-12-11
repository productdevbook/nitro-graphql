# Multi-stage Dockerfile for Nitro GraphQL Drizzle ORM Example

# Stage 1: Dependencies
FROM node:24-alpine AS deps

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM node:24-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source files
COPY . .

# Build the application
RUN pnpm build

# Stage 3: Runner
FROM node:24-alpine AS runner

WORKDIR /app

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nitro

# Copy built application
COPY --from=builder --chown=nitro:nodejs /app/.output /app/.output
COPY --from=builder --chown=nitro:nodejs /app/server/drizzle /app/server/drizzle
COPY --from=builder --chown=nitro:nodejs /app/drizzle.config.ts /app/drizzle.config.ts
COPY --from=builder --chown=nitro:nodejs /app/package.json /app/package.json

# Install srvx globally and production dependencies for drizzle-kit (for migrations)
RUN corepack enable && corepack prepare pnpm@latest --activate && \
    npm install -g srvx && \
    pnpm add -P drizzle-kit drizzle-orm pg tsx

# Switch to non-root user
USER nitro

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/graphql/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start command with srvx
CMD ["srvx", ".output/server/index.mjs"]
