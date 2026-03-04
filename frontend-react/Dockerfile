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

# Production stage — tiny nginx image
FROM nginx:alpine AS runtime

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
