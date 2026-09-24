/**
 * BPM Platform — Live Telemetry WebSocket Simulator
 * Broadcasts synthetic microgrid telemetry every 2 seconds.
 * Periodically injects threshold warnings to demo the Kanban alerting workflow.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { URL } from 'url';

interface TelemetryPayload {
  type: 'telemetry' | 'alert' | 'heartbeat';
  timestamp: string;
  solarKw?: number;
  bioenergyKw?: number;
  loadKw?: number;
  gridImportKw?: number;
  gridExportKw?: number;
  batterySoc?: number;
  batterySoh?: number;
  batteryCycles?: number;
  batteryVoltageV?: number;
  batteryCurrentA?: number;
  batteryTempC?: number;
  pneumaticPressurePsi?: number;
  pneumaticTempC?: number;
  systemHealthStatus?: string;
  frequency?: number;
  powerFactor?: number;
  alert?: {
    level: 'warning' | 'critical';
    parameter: string;
    value: number;
    threshold: number;
    message: string;
  };
}

// ─── Simulation State ────────────────────────────────────────────────────────
let simSolarKw = 45.0;
let simBioKw = 47.0;
let simLoadKw = 78.0;
let simBatterySoc = 72.0;
let simBatterySoh = 96.4;
let simBatteryCycles = 1265;
let simPressure = 118.0;
let tickCount = 0;

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function getHour(): number {
  return new Date().getHours();
}

function generateTick(): TelemetryPayload {
  tickCount++;
  const hour = getHour();

  // ── Solar curve simulation ────────────────────────────────────────────────
  let solarTarget = 0;
  if (hour >= 6 && hour <= 20) {
    const angle = ((hour - 6) / 14) * Math.PI;
    solarTarget = Math.sin(angle) * 80 + rand(-3, 3);
  }
  simSolarKw = clamp(simSolarKw + (solarTarget - simSolarKw) * 0.1 + rand(-1, 1), 0, 90);

  // ── Bioenergy steady baseload ─────────────────────────────────────────────
  const bioTarget = (hour >= 20 || hour < 6) ? 55 : 45;
  simBioKw = clamp(simBioKw + (bioTarget - simBioKw) * 0.05 + rand(-0.5, 0.5), 35, 62);

  // ── Load profile ──────────────────────────────────────────────────────────
  let loadTarget = 80;
  if (hour >= 9 && hour <= 17) loadTarget = 95;
  else if (hour >= 17 && hour <= 21) loadTarget = 105;
  else if (hour < 6) loadTarget = 42;
  simLoadKw = clamp(simLoadKw + (loadTarget - simLoadKw) * 0.08 + rand(-2, 2), 30, 125);

  // ── Battery dynamics ──────────────────────────────────────────────────────
  const netPower = simSolarKw + simBioKw - simLoadKw;
  const batteryDelta = netPower * 0.015; // Proportional charge/discharge
  simBatterySoc = clamp(simBatterySoc + batteryDelta + rand(-0.05, 0.05), 5, 100);
  simBatterySoh = clamp(simBatterySoh - 0.0001, 70, 99); // Slow degradation
  if (Math.random() < 0.005) simBatteryCycles++; // Occasional cycle increment

  const batteryVoltage = 48.0 + (simBatterySoc / 100) * 8;
  const batteryCurrent = clamp(-netPower * 2, -100, 100);
  const batteryTemp = clamp(25 + Math.abs(batteryCurrent) * 0.08 + rand(-0.5, 0.5), 15, 55);

  // ── Grid ──────────────────────────────────────────────────────────────────
  const excess = netPower - batteryDelta * 60;
  const gridImport = excess < 0 ? clamp(Math.abs(excess) * 0.5, 0, 80) : 0;
  const gridExport = excess > 5 ? clamp(excess * 0.6, 0, 60) : 0;

  // ── Pneumatic ─────────────────────────────────────────────────────────────
  simPressure = clamp(simPressure + rand(-0.8, 0.8), 90, 150);
  const pneumaticTemp = clamp(35 + rand(-2, 2), 22, 70);

  // ── Health status ────────────────────────────────────────────────────────
  let healthStatus = 'NORMAL';
  if (simBatterySoc < 10 || gridImport > 70 || simPressure < 80) healthStatus = 'CRITICAL';
  else if (simBatterySoc < 20 || gridImport > 45 || simPressure < 95 || simPressure > 145) healthStatus = 'WARNING';

  // ── Periodic alert injection (every ~60 ticks / ~2 minutes) ──────────────
  let alert: TelemetryPayload['alert'] | undefined;
  if (tickCount % 60 === 0) {
    // Inject a battery warning
    alert = {
      level: 'warning',
      parameter: 'batterySoc',
      value: parseFloat(simBatterySoc.toFixed(1)),
      threshold: 20,
      message: `Battery SoC at ${simBatterySoc.toFixed(1)}% — approaching warning threshold of 20%`,
    };
    healthStatus = 'WARNING';
  } else if (tickCount % 150 === 0) {
    // Inject a critical pressure event
    alert = {
      level: 'critical',
      parameter: 'pneumaticPressurePsi',
      value: 78.5,
      threshold: 80,
      message: 'Pneumatic vessel pressure CRITICAL: 78.5 PSI below minimum safe operating pressure of 80 PSI',
    };
    healthStatus = 'CRITICAL';
  }

  const payload: TelemetryPayload = {
    type: alert ? 'alert' : 'telemetry',
    timestamp: new Date().toISOString(),
    solarKw: parseFloat(simSolarKw.toFixed(2)),
    bioenergyKw: parseFloat(simBioKw.toFixed(2)),
    loadKw: parseFloat(simLoadKw.toFixed(2)),
    gridImportKw: parseFloat(gridImport.toFixed(2)),
    gridExportKw: parseFloat(gridExport.toFixed(2)),
    batterySoc: parseFloat(simBatterySoc.toFixed(1)),
    batterySoh: parseFloat(simBatterySoh.toFixed(2)),
    batteryCycles: simBatteryCycles,
    batteryVoltageV: parseFloat(batteryVoltage.toFixed(2)),
    batteryCurrentA: parseFloat(batteryCurrent.toFixed(1)),
    batteryTempC: parseFloat(batteryTemp.toFixed(1)),
    pneumaticPressurePsi: parseFloat(simPressure.toFixed(1)),
    pneumaticTempC: parseFloat(pneumaticTemp.toFixed(1)),
    systemHealthStatus: healthStatus,
    frequency: parseFloat((50.0 + rand(-0.12, 0.12)).toFixed(3)),
    powerFactor: parseFloat((0.95 + rand(-0.02, 0.02)).toFixed(3)),
    ...(alert ? { alert } : {}),
  };

  return payload;
}

// ─── WebSocket Server ─────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export function createWebSocketServer(server: import('http').Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  const clients = new Set<WebSocket>();
  let broadcastInterval: ReturnType<typeof setInterval> | null = null;

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    // Authenticate WebSocket via query param token or cookie
    let authenticated = false;
    try {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token') ||
        req.headers.cookie?.match(/bpm_token=([^;]+)/)?.[1];

      if (token) {
        jwt.verify(token, JWT_SECRET);
        authenticated = true;
      }
    } catch {
      // Allow connection in dev if no token present
      if (process.env.NODE_ENV !== 'production') authenticated = true;
    }

    if (!authenticated) {
      ws.close(4001, 'Unauthorized');
      return;
    }

    clients.add(ws);
    console.log(`[WS] Client connected — ${clients.size} active connection(s)`);

    // Send immediate telemetry on connect
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(generateTick()));
    }

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() }));
        }
      } catch { /* ignore malformed messages */ }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`[WS] Client disconnected — ${clients.size} active connection(s)`);
    });

    ws.on('error', (err) => {
      console.error('[WS] Client error:', err.message);
      clients.delete(ws);
    });

    // Start broadcast interval if not already running
    if (!broadcastInterval) {
      broadcastInterval = setInterval(() => {
        if (clients.size === 0) return;
        const payload = JSON.stringify(generateTick());
        clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
          }
        });
      }, 2000); // Every 2 seconds
    }
  });

  wss.on('close', () => {
    if (broadcastInterval) {
      clearInterval(broadcastInterval);
      broadcastInterval = null;
    }
  });

  console.log('[WS] WebSocket telemetry simulator initialized on /ws');
  return wss;
}
