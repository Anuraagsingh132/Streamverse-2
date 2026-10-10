# -------------------------------------------------------------
# Stage 1: Build Stage (Node 20 Alpine Builder)
# -------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies with lockfile caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy application source code
COPY . .

# Generate dynamic sitemap, run TypeScript compiler, and build optimized production bundle
RUN npm run build

# -------------------------------------------------------------
# Stage 2: Production Runner Stage (Nginx Alpine)
# -------------------------------------------------------------
FROM nginx:alpine AS runner

# Remove default Nginx website and config
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

# Copy production Nginx configuration with gzip and caching
COPY nginx.conf /etc/nginx/nginx.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose standard HTTP port
EXPOSE 80

# Health check verification
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/healthz || exit 1

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
