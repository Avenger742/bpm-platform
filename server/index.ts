/**
 * BPM Platform — Server Entry Point
 * Express + WebSocket + Static file serving for single-service deployment
 */

import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { authRouter } from './routes/auth';
import { telemetryRouter } from './routes/telemetry';
import { tariffsRouter } from './routes/tariffs';
import { ticketsRouter } from './routes/tickets';
import { thresholdsRouter } from './routes/thresholds';
import { usersRouter } from './routes/users';
import { auditLogRouter } from './routes/auditLog';
import { createWebSocketServer } from './websocket/simulator';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PROD = NODE_ENV === 'production';

// ─── Security & Parsing Middleware ──────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: IS_PROD ? undefined : false, // Relax CSP in dev for Vite HMR
  crossOriginEmbedderPolicy: false,
}));

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',');
app.use(cors({
  origin: IS_PROD ? corsOrigins : true,
  credentials: true,
}));

app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

if (NODE_ENV !== 'test') {
  app.use(morgan(IS_PROD ? 'combined' : 'dev'));
}

// ─── Rate Limiting ──────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '500'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// ─── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/telemetry', telemetryRouter);
app.use('/api/tariffs', tariffsRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/thresholds', thresholdsRouter);
app.use('/api/users', usersRouter);
app.use('/api/audit', auditLogRouter);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── Static Frontend Serving (Production) ───────────────────────────────────
if (IS_PROD) {
  const distPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(distPath, { maxAge: '1d' }));

  // SPA fallback: serve index.html for all non-API routes
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.json({
      message: 'BPM Platform API — Development Mode',
      docs: 'Connect the Vite dev server at http://localhost:5173',
      routes: ['/api/auth', '/api/telemetry', '/api/tariffs', '/api/tickets', '/api/thresholds', '/api/users', '/api/audit'],
      websocket: 'ws://localhost:3000/ws',
    });
  });
}

// ─── Global Error Handler ───────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: IS_PROD ? 'Internal server error' : err.message });
});

// ─── HTTP + WebSocket Server ─────────────────────────────────────────────────
const server = http.createServer(app);
createWebSocketServer(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║        BPM Platform — Server Running                     ║
╠══════════════════════════════════════════════════════════╣
║  Mode:       ${NODE_ENV.padEnd(43)}║
║  API:        http://localhost:${PORT}/api${' '.repeat(26 - PORT.toString().length)}║
║  WebSocket:  ws://localhost:${PORT}/ws${' '.repeat(27 - PORT.toString().length)}║
║  Health:     http://localhost:${PORT}/api/health${' '.repeat(20 - PORT.toString().length)}║
╚══════════════════════════════════════════════════════════╝
  `);
});

export default app;
