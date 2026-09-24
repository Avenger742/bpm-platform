# BPM Platform — Deployment Guide

## Prerequisites
- Node.js 20+ and npm 9+
- Git
- Docker + Docker Compose (for containerized deployment)

---

## Local Development (Zero-Config)

```bash
# 1. Clone and enter the directory
cd "BPM Software"

# 2. Copy environment file
cp .env.example .env
# Edit .env if needed (SQLite is the default — no DB install required)

# 3. Install all dependencies
npm install
cd client && npm install && cd ..

# 4. Initialize the database and seed
npm run db:push       # Creates dev.db (SQLite)
npm run seed          # Seeds 3 users, 30-day telemetry, tickets

# 5. Start development servers (hot-reload)
npm run dev
```

Visit:
- **Frontend**: http://localhost:5173
- **API**: http://localhost:3000/api
- **WebSocket**: ws://localhost:3000/ws

### Demo Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@bpmplatform.io | Admin@BPM2024 |
| Operator | operator@bpmplatform.io | Operator@BPM2024 |
| Viewer | user@bpmplatform.io | User@BPM2024 |

---

## Production Build (Local Test)

```bash
# Build everything
npm run build

# Set production env
NODE_ENV=production npm start
```

The Express server will serve the compiled React app at http://localhost:3000.

---

## Docker Compose (Recommended for Self-Hosted)

```bash
# Build and start services (app + PostgreSQL)
docker compose up --build -d

# Run seed on first deploy
docker compose exec app npm run seed

# View logs
docker compose logs -f app

# Stop
docker compose down
```

> **Note**: Change `bpm_pass_change_in_prod` and `JWT_SECRET` in `docker-compose.yml` before production use.

---

## Deploy to Render (Recommended Cloud)

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial BPM Platform"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/bpm-platform.git
   git push -u origin main
   ```

2. **Create Render account** at https://render.com

3. **New Blueprint** → Connect your GitHub repo → Render will automatically detect `render.yaml`

4. **Set environment variables** in Render dashboard:
   - `JWT_SECRET` — a strong random string (min 32 chars)
   - `CORS_ORIGIN` — your Render app URL (e.g., `https://bpm-platform.onrender.com`)

5. **Deploy** — Render runs migrations automatically on startup via `startCommand`

6. **Run seed** via Render Shell (one-time):
   ```bash
   npm run seed
   ```

---

## Deploy to Railway

1. Install Railway CLI: `npm i -g @railway/cli`
2. Login: `railway login`
3. Initialize: `railway init`
4. Add PostgreSQL plugin in Railway dashboard
5. Set `DATABASE_URL` from Railway's connection string
6. Deploy: `railway up`

Railway reads `Procfile` for the start command automatically.

---

## Deploy to Google Cloud Run

```bash
# Build and push container
docker build -t gcr.io/YOUR_PROJECT/bpm-platform .
docker push gcr.io/YOUR_PROJECT/bpm-platform

# Deploy
gcloud run deploy bpm-platform \
  --image gcr.io/YOUR_PROJECT/bpm-platform \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,JWT_SECRET=YOUR_SECRET,DATABASE_URL=YOUR_POSTGRES_URL \
  --port 3000 \
  --memory 512Mi
```

Use **Cloud SQL** (PostgreSQL) as the database and connect via Unix socket or public IP.

---

## Switching from SQLite to PostgreSQL

1. Update `.env`:
   ```
   DATABASE_URL="postgresql://user:password@host:5432/bpm_platform?schema=public"
   ```

2. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

3. Run migration:
   ```bash
   npx prisma migrate dev --name init
   npm run seed
   ```

---

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Database connection string | ✅ Yes |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | ✅ Yes |
| `PORT` | Server port (default: 3000) | Optional |
| `NODE_ENV` | `development` or `production` | Optional |
| `JWT_EXPIRES_IN` | Token lifetime (default: `7d`) | Optional |
| `CORS_ORIGIN` | Allowed CORS origins | Optional |
| `RATE_LIMIT_MAX` | Max requests per window | Optional |

---

## Health Check

```
GET /api/health
```

Returns `{ status: "ok", version: "1.0.0", environment: "production", timestamp: "..." }`

Use this endpoint for load balancer and uptime monitoring configuration.
