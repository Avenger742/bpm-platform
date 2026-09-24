import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

export interface TelemetryData {
  type: 'telemetry' | 'alert' | 'heartbeat';
  timestamp: string;
  solarKw: number;
  bioenergyKw: number;
  loadKw: number;
  gridImportKw: number;
  gridExportKw: number;
  batterySoc: number;
  batterySoh: number;
  batteryCycles: number;
  batteryVoltageV: number;
  batteryCurrentA: number;
  batteryTempC: number;
  pneumaticPressurePsi: number;
  pneumaticTempC: number;
  systemHealthStatus: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'OFFLINE';
  frequency: number;
  powerFactor: number;
  alert?: {
    level: 'warning' | 'critical';
    parameter: string;
    value: number;
    threshold: number;
    message: string;
  };
}

interface UseWebSocketReturn {
  data: TelemetryData | null;
  history: TelemetryData[];
  connected: boolean;
  alerts: TelemetryData['alert'][];
}

const MAX_HISTORY = 60; // Keep 60 data points (2 minutes)
const MAX_ALERTS = 20;

export function useWebSocket(): UseWebSocketReturn {
  const { token } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [data, setData] = useState<TelemetryData | null>(null);
  const [history, setHistory] = useState<TelemetryData[]>([]);
  const [connected, setConnected] = useState(false);
  const [alerts, setAlerts] = useState<TelemetryData['alert'][]>([]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host;
    const wsUrl = token
      ? `${protocol}://${host}/ws?token=${encodeURIComponent(token)}`
      : `${protocol}://${host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      console.log('[WS] Connected to BPM telemetry stream');
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as TelemetryData;
        setData(payload);

        if (payload.type === 'alert' || payload.type === 'telemetry') {
          setHistory((prev) => {
            const next = [...prev, payload];
            return next.slice(-MAX_HISTORY);
          });
        }

        if (payload.alert) {
          setAlerts((prev) => {
            const next = [payload.alert!, ...prev];
            return next.slice(0, MAX_ALERTS);
          });
        }
      } catch { /* ignore parse errors */ }
    };

    ws.onclose = () => {
      setConnected(false);
      console.log('[WS] Disconnected — reconnecting in 3s...');
      reconnectTimerRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [token]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { data, history, connected, alerts };
}
