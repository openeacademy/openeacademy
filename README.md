# Open E Academy — openeacademy.in

> A modern online learning platform built with React, Node.js, PostgreSQL, and Redis.

## Architecture

```
Internet
   │
   ▼
Traefik (80/443) ── Let's Encrypt SSL (auto-renew)
   ├── openeacademy.in           → Web App  (React + Vite)
   ├── openeacademy.in/admin     → Admin Panel (React + Vite)
   └── api.openeacademy.in       → Backend API (Express + Prisma)
```

### URL Routing

| URL | Service |
|-----|---------|
| `https://openeacademy.in` | Web app (React SPA) |
| `https://openeacademy.in/admin` | Admin dashboard |
| `https://openeacademy.in/admin/login` | Admin login (React Router) |
| `https://api.openeacademy.in` | REST API |

## Project Structure

```
opene/
├── web/            # Student-facing React app (port 3000 dev)
├── admin/          # Admin panel React app (port 3001 dev)
├── backend/        # Express + Prisma API (port 5000 dev)
├── mobile/         # React Native mobile app
├── traefik/        # Traefik reverse-proxy config
├── .github/        # GitHub Actions CI/CD
└── docker-compose.yml
```

---

## Local Development (without Docker)

### Prerequisites
- Node.js 20+
- PostgreSQL 16
- Redis 7

### Setup

```bash
# 1. Install dependencies
cd web && npm install
cd ../admin && npm install
cd ../backend && npm install

# 2. Configure backend env
cp backend/.env.example backend/.env
# Edit backend/.env with your local DB/Redis credentials

# 3. Run Prisma migrations
cd backend && npx prisma migrate dev

# 4. Start all services (3 terminals)
cd web && npm run dev        # → http://localhost:3000
cd admin && npm run dev      # → http://localhost:3001
cd backend && npm run dev    # → http://localhost:5000
```

---

## Docker Development (local containers)

```bash
# Start all services with local overrides (no TLS)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Access:
#   Web   → http://localhost:3000
#   Admin → http://localhost:3001
#   API   → http://localhost:5000
```

---

## Production Deployment (VPS)

### VPS Requirements
- Ubuntu 22.04+
- Docker + Docker Compose v2 installed
- Ports 80 and 443 open in firewall
- DNS records pointing to VPS IP:
  - `A  openeacademy.in     → <VPS_IP>`
  - `A  api.openeacademy.in → <VPS_IP>`

### First-Time VPS Setup

```bash
# On VPS
git clone https://github.com/openeacademy/openeacademy.git /opt/openeacademy
cd /opt/openeacademy

# Create backend .env (fill in production values)
cp backend/.env.example backend/.env
nano backend/.env

# Create Traefik acme dir with correct permissions
mkdir -p traefik/acme
touch traefik/acme/acme.json
chmod 600 traefik/acme/acme.json

# Start everything
docker compose up -d --build
```

### GitHub Secrets Required

Add these in **Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | VPS IP address or hostname |
| `VPS_USER` | SSH username (e.g., `ubuntu`, `root`) |
| `VPS_SSH_KEY` | Private SSH key (contents of `~/.ssh/id_rsa`) |
| `VPS_PORT` | SSH port (default `22`) |
| `VPS_PATH` | Deployment path (e.g., `/opt/openeacademy`) |

### CI/CD Flow

Every push to `main`:
1. GitHub Actions checks out code
2. Runs type-check on backend (fast validation)
3. SSHs into VPS
4. Runs `git pull` + `docker compose up -d --build`
5. Prunes unused Docker images

---

## Environment Variables

See [`backend/.env.example`](./backend/.env.example) for all required variables.

Key production values to set:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — strong random strings
- `REDIS_URL` — Redis connection with password
- `RAZORPAY_*` — Payment gateway credentials
- `SMTP_*` — Email credentials
- `WEB_APP_URL=https://openeacademy.in`
- `ADMIN_PANEL_URL=https://openeacademy.in/admin`
- `CORS_ORIGINS=https://openeacademy.in,https://openeacademy.in`

---

## Useful Commands

```bash
# View running containers
docker compose ps

# View logs
docker compose logs -f backend
docker compose logs -f traefik

# Run Prisma migration on production
docker compose exec backend npx prisma migrate deploy

# Restart a single service
docker compose restart backend

# Pull latest & redeploy
git pull && docker compose up -d --build

# Prune unused images
docker image prune -f
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| Admin Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| ORM | Prisma |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7, BullMQ |
| Payments | Razorpay |
| Storage | AWS S3 |
| Reverse Proxy | Traefik v3 |
| SSL | Let's Encrypt (auto-renew) |
| CI/CD | GitHub Actions |
| Containerization | Docker + Docker Compose |
