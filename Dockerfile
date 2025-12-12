# ============================================================================
# Multi-stage Dockerfile for Google Cloud Run
# Fix: --legacy-peer-deps eklendi
# ============================================================================

# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Paket dosyalarini kopyala
COPY package*.json ./

# Install dependencies (Çakışmaları görmezden gelerek)
RUN npm ci --legacy-peer-deps

# Kaynak kodları kopyala
COPY . .

# Uygulamayı derle
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app

# Paket dosyalarini kopyala
COPY package*.json ./

# Sadece production paketlerini yükle (Yine çakışmaları yoksayarak)
RUN npm ci --legacy-peer-deps --only=production && npm cache clean --force

# Build dosyasını taşı
COPY --from=builder /app/dist ./dist
# Varsa shared klasörünü taşı
COPY --from=builder /app/shared ./shared

# Env vars
ENV PORT=8080
ENV NODE_ENV=production

# Portu aç
EXPOSE 8080

# Başlat
CMD ["node", "dist/index.cjs"]