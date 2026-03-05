# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files first for caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
ARG VITE_APP_URL
ARG VITE_OSLKS_COLLECTOR_URL
ARG VITE_OSLKS_WEBSITE_ID
ENV VITE_APP_URL=$VITE_APP_URL
ENV VITE_OSLKS_COLLECTOR_URL=$VITE_OSLKS_COLLECTOR_URL
ENV VITE_OSLKS_WEBSITE_ID=$VITE_OSLKS_WEBSITE_ID
RUN npm run build

# Production stage — Caddy
FROM caddy:alpine AS runtime

# Copy Caddy config
COPY Caddyfile /etc/caddy/Caddyfile

# Copy built static files
COPY --from=builder /app/dist /srv

EXPOSE 80
