# Frontend Dockerfile for React + Vite (Static Build)
FROM oven/bun:1.2-alpine AS builder
WORKDIR /app

# Dependencies
COPY concern-app/package.json concern-app/bun.lock* ./
RUN bun install

# Build args for environment variables
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build (skip TypeScript check for production build)
COPY concern-app/ ./
RUN bun run vite build

# Production - Nginx for static files
FROM nginx:alpine AS runner

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY docker/nginx/frontend.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
