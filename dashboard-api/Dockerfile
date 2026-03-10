FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app

# Copy package files and install PRODUCTION only dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy required dist
COPY --from=builder /app/dist ./dist 

# SRE: Drop privileges (Zero Trust)
USER node

EXPOSE 8081
CMD ["node", "dist/index.js"]
