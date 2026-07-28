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

# Switch to non-root user
USER nodejs

EXPOSE 5000

# Healthcheck hits the /health endpoint (add one to your Express app if not present)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

CMD ["node", "dist/index.js"]
