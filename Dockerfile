# Dockerfile - multi-stage build for Kathaa 360 (static site + future backend ready)
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Build step (no-op for static, but ready for Next.js/React when added)
RUN npm run build --if-present

# Stage 2: Production runtime (static file server)
FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app ./
# Install serve for static hosting
RUN npm install -g serve
EXPOSE 3000
ENV NODE_ENV=production
# Serve static files from current directory
CMD ["serve", "-s", ".", "-l", "3000"]

# === Future backend stage (uncomment when adding API server) ===
# FROM node:20-alpine AS backend
# WORKDIR /app
# COPY --from=builder /app ./
# EXPOSE 4000
# ENV NODE_ENV=production
# CMD ["node", "server/index.js"]