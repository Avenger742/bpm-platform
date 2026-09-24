import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/hooks/useApi';
import { useWebSocket } from '@/hooks/useWebSocket';
import { AnimatedGauge } from '@/components/Gauges';
import { SectionHeader, PageLoader, KpiCard } from '@/components/UI';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { format, addMonths } from 'date-fns';
import { Battery, Thermometer, Gauge, AlertTriangle } from 'lucide-react';

interface TelRecord {
  timestamp: string;
  batterySoc: number;
  batterySoh: number;
  batteryCycles: number;
  batteryVoltageV: number;
  batteryTempC: number;
  pneumaticPressurePsi: number;
  pneumaticTempC: number;
}

export default function StoragePage() {
  const { token } = useAuth();
  const { data: live } = useWebSocket();
  const [history, setHistory] = useState<TelRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ data: TelRecord[] }>('/api/telemetry?limit=720', token)
      .then(res => {
        const raw = [...res.data].reverse();
        setHistory(raw);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  // ── Degradation Curve + Projection ────────────────────────────────────────
  // Sample SoH daily averages from historical data
  const dailySoH: { day: number; soh: number }[] = [];
  for (let i = 0; i < 30; i++) {
    const dayRecs = history.filter(r => {
      const d = Math.floor((Date.now() - new Date(r.timestamp).getTime()) / (86400000));
      return d === (29 - i);
    });
    if (dayRecs.length > 0) {
      const avg = dayRecs.reduce((s, r) => s + r.batterySoh, 0) / dayRecs.length;
      dailySoH.push({ day: i + 1, soh: parseFloat(avg.toFixed(3)) });
    }
  }

  // Linear regression for degradation rate
  let slopePerDay = -0.01; // Default degradation
  if (dailySoH.length >= 2) {
    const n = dailySoH.length;
    const sumX = dailySoH.reduce((s, d) => s + d.day, 0);
    const sumY = dailySoH.reduce((s, d) => s + d.soh, 0);
    const sumXY = dailySoH.reduce((s, d) => s + d.day * d.soh, 0);
    const sumX2 = dailySoH.reduce((s, d) => s + d.day * d.day, 0);
    slopePerDay = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  const currentSoH = live?.batterySoh ?? (dailySoH[dailySoH.length - 1]?.soh ?? 96.4);
  const WARNING_SOH = 80;
  const CRITICAL_SOH = 70;

  const daysToWarning = slopePerDay < 0 ? Math.ceil((currentSoH - WARNING_SOH) / Math.abs(slopePerDay)) : Infinity;
  const daysToCritical = slopePerDay < 0 ? Math.ceil((currentSoH - CRITICAL_SOH) / Math.abs(slopePerDay)) : Infinity;

  const warningDate = addMonths(new Date(), daysToWarning / 30);
  const criticalDate = addMonths(new Date(), daysToCritical / 30);

  // Extended projection curve
  const projectionDays = Math.min(daysToWarning + 90, 730);
  const degradationCurve = [
    ...dailySoH,
    ...Array.from({ length: Math.ceil(projectionDays / 7) }, (_, i) => ({
      day: 30 + (i + 1) * 7,
      soh: parseFloat(Math.max(CRITICAL_SOH - 2, currentSoH + slopePerDay * ((i + 1) * 7)).toFixed(3)),
    })),
  ];

  // Pneumatic history
  const pneumaticData = history.slice(-100).map(r => ({
    time: format(new Date(r.timestamp), 'MM/dd HH:mm'),
    Pressure: +r.pneumaticPressurePsi.toFixed(1),
    Temp: +r.pneumaticTempC.toFixed(1),
  }));

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Storage Management</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Battery bank health, CapEx forecasting & pneumatic vessel monitoring</p>
      </div>

      {/* Live Battery Gauges */}
      <div className="card p-6">
        <SectionHeader title="Live Battery Instrument Panel" />
        <div className="flex flex-wrap justify-around gap-6">
          <AnimatedGauge value={live?.batterySoc ?? 0} label="State of Charge" unit="%" warningThreshold={20} criticalThreshold={10} size={140} />
          <AnimatedGauge value={live?.batterySoh ?? 0} label="State of Health" unit="%" warningThreshold={80} criticalThreshold={70} size={140} />
          <AnimatedGauge value={live?.batteryTempC ?? 0} min={-10} max={60} label="Temperature" unit="°C" warningThreshold={40} criticalThreshold={50} color="#f97316" size={140} />
          <AnimatedGauge value={live?.batteryVoltageV ?? 48} min={44} max={58} label="Voltage" unit="V" color="#0ea5e9" size={140} />
        </div>
      </div>

      {/* Battery KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Battery SoC" value={live?.batterySoc?.toFixed(1) ?? '—'} unit="%" icon={<Battery size={16} />} color={live && live.batterySoc < 20 ? 'text-danger-500' : 'text-brand-500'} />
        <KpiCard title="Cycle Count" value={live?.batteryCycles ?? '—'} icon={<Gauge size={16} />} color="text-accent-400" subtitle="Total charge cycles" />
        <KpiCard title="Pack Temp" value={live?.batteryTempC?.toFixed(1) ?? '—'} unit="°C" icon={<Thermometer size={16} />} color={live && live.batteryTempC > 40 ? 'text-warning-500' : 'text-text-secondary'} />
        <KpiCard title="Current" value={live?.batteryCurrentA?.toFixed(1) ?? '—'} unit="A" icon={<Battery size={16} />} color="text-battery-400" subtitle={live && live.batteryCurrentA < 0 ? 'Charging' : 'Discharging'} />
      </div>

      {/* Degradation Curve + CapEx Forecaster */}
      <div className="card p-5">
        <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
          <div>
            <SectionHeader title="Battery Degradation Curve & CapEx Forecaster" />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Linear extrapolation on 30-day SoH history · Rate: {(slopePerDay * 1000).toFixed(2)} ‰/day
            </p>
          </div>
          <div className="space-y-2 text-right">
            <div className="flex items-center gap-2 justify-end">
              <AlertTriangle size={14} className="text-warning-500" />
              <span className="text-sm font-medium text-warning-500">
                Warning threshold (~{WARNING_SOH}% SoH): {isFinite(daysToWarning) ? format(warningDate, 'MMM yyyy') : 'Beyond range'}
              </span>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <AlertTriangle size={14} className="text-danger-500" />
              <span className="text-sm font-medium text-danger-500">
                Replacement needed (~{CRITICAL_SOH}% SoH): {isFinite(daysToCritical) ? format(criticalDate, 'MMM yyyy') : 'Beyond range'}
              </span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={degradationCurve} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} label={{ value: 'Day', position: 'insideBottomRight', offset: -5, fontSize: 10, fill: 'var(--text-muted)' }} />
            <YAxis domain={[65, 100]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} unit="%" />
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12 }}
              formatter={(val) => [`${Number(val).toFixed(2)}%`, 'State of Health']} />
            <ReferenceLine y={WARNING_SOH} stroke="#f97316" strokeDasharray="5 3" label={{ value: 'Warning 80%', position: 'right', fontSize: 10, fill: '#f97316' }} />
            <ReferenceLine y={CRITICAL_SOH} stroke="#ef4444" strokeDasharray="5 3" label={{ value: 'Critical 70%', position: 'right', fontSize: 10, fill: '#ef4444' }} />
            <ReferenceLine x={30} stroke="var(--text-muted)" strokeDasharray="3 3" label={{ value: 'Now', position: 'top', fontSize: 10 }} />
            <Line
              type="monotone"
              dataKey="soh"
              stroke="#0ea5e9"
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-accent-500" /> Historical (solid)</span>
          <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-accent-500" /> Projected (dashed)</span>
        </div>
      </div>

      {/* Pneumatic Vessel */}
      <div className="card p-5">
        <SectionHeader title="Pneumatic Vessel Monitoring" subtitle="Pressure and temperature over last 100 readings" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={pneumaticData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} interval="preserveStartEnd" />
                <YAxis yAxisId="left" domain={[70, 170]} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} unit=" PSI" />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} unit="°C" />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 11 }} />
                <ReferenceLine yAxisId="left" y={95} stroke="#f97316" strokeDasharray="4 2" />
                <ReferenceLine yAxisId="left" y={145} stroke="#f97316" strokeDasharray="4 2" />
                <Line yAxisId="left" type="monotone" dataKey="Pressure" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="Temp" stroke="#f97316" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-4">
            <AnimatedGauge
              value={live?.pneumaticPressurePsi ?? 0}
              min={60}
              max={180}
              label="Live Pressure"
              unit="PSI"
              color="#8b5cf6"
              warningThreshold={95}
              criticalThreshold={80}
              size={120}
            />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Warning band:</span>
                <span className="text-warning-500 font-mono">95–145 PSI</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Critical band:</span>
                <span className="text-danger-500 font-mono">&lt;80 / &gt;160 PSI</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-muted)' }}>Vessel Temp:</span>
                <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{live?.pneumaticTempC?.toFixed(1) ?? '—'}°C</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
