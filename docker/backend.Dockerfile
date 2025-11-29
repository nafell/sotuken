# Backend Dockerfile for Bun + Hono
FROM oven/bun:1.2-alpine AS base
WORKDIR /app

# Dependencies layer
FROM base AS deps
COPY server/package.json server/bun.lock* ./
RUN bun install --production

# Build layer
FROM base AS builder
COPY server/package.json server/bun.lock* ./
RUN bun install
COPY server/ ./
RUN bun run build

# Production image
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 bunjs

COPY --from=deps --chown=bunjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=bunjs:nodejs /app/dist ./dist
COPY --from=builder --chown=bunjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=bunjs:nodejs /app/src/database ./src/database
COPY server/package.json ./

# Phase 6: 実験設定ファイル
COPY --chown=bunjs:nodejs config/ /config/

USER bunjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["bun", "run", "dist/index.js"]
