# ─── Stage 1: Build Frontend ──────────────────────────────────────────────────
FROM node:20-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci --ignore-scripts

COPY client/ ./
RUN npm run build

# ─── Stage 2: Build Server ────────────────────────────────────────────────────
FROM node:20-alpine AS server-builder
WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
RUN npm ci --ignore-scripts

COPY server/ ./server/
COPY prisma/ ./prisma/

RUN npx prisma generate
RUN npm run build:server

# ─── Stage 3: Production Runner ───────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Security: run as non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S bpm -u 1001

# Copy production deps
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

# Copy generated Prisma client
COPY --from=server-builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy compiled server
COPY --from=server-builder /app/dist ./dist

# Copy Prisma schema for migrations
COPY prisma/ ./prisma/

# Copy compiled frontend into location where server serves it
COPY --from=client-builder /app/client/dist ./client/dist

USER bpm

EXPOSE 3000

# Run DB migrations, then start server
CMD sh -c "npx prisma migrate deploy && node dist/server/index.js"

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1
