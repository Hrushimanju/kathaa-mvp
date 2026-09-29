# Dockerfile - multi-stage build for Kathaa 360
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Build the Next.js app (adjust if you have a separate frontend folder)
RUN npm run build --if-present

# Stage 2: Run
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app ./
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "server/index.js"]  # adjust entrypoint as needed