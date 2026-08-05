# ── Stage 1: Build ────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install all deps (including devDeps for build tools)
COPY package*.json ./
RUN npm ci --frozen-lockfile

# Copy Prisma schema first and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source and compile TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Stage 2: Production image ─────────────────────────────────
FROM node:20-alpine AS production

# Install OpenSSL (required by Prisma engine binary on Alpine/musl)
RUN apk add --no-cache openssl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser  -S nodejs -u 1001 -G nodejs

WORKDIR /app

# Copy package files and install ONLY production deps
COPY package*.json ./
RUN npm ci --frozen-lockfile --only=production && \
    npm cache clean --force

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Copy Prisma client (generated binary + schema)
COPY --from=builder /app/node_modules/.prisma    ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma    ./node_modules/@prisma
COPY               prisma                        ./prisma

# Create logs directory for Winston and assign permissions
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# Switch to non-root user
USER nodejs

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5000/health || exit 1

CMD ["node", "dist/index.js"]
