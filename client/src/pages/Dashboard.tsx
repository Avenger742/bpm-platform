import { useWebSocket } from '@/hooks/useWebSocket';
import { AnimatedGauge, PowerFlowDiagram } from '@/components/Gauges';
import { StatusDot, AlertBanner, KpiCard } from '@/components/UI';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { Activity, Zap, Battery, Gauge } from 'lucide-react';

export default function DashboardPage() {
  const { data, history, connected, alerts } = useWebSocket();

  const chartData = history.map(d => ({
    time: format(new Date(d.timestamp), 'HH:mm:ss'),
    Solar: +d.solarKw.toFixed(1),
    Bioenergy: +d.bioenergyKw.toFixed(1),
    Load: +d.loadKw.toFixed(1),
    'Grid Import': +d.gridImportKw.toFixed(1),
    'Battery SoC': +d.batterySoc.toFixed(1),
  }));

  const SUBSYSTEMS = [
    { name: 'Solar Array',       value: data ? `${data.solarKw.toFixed(1)} kW`  : '—', status: data && data.solarKw > 0 ? 'NORMAL' : 'OFFLINE' },
    { name: 'Bioenergy Generator', value: data ? `${data.bioenergyKw.toFixed(1)} kW` : '—', status: data && data.bioenergyKw > 35 ? 'NORMAL' : 'WARNING' },
    { name: 'Battery Pack',      value: data ? `${data.batterySoc.toFixed(1)}%`  : '—', status: data ? (data.batterySoc < 10 ? 'CRITICAL' : data.batterySoc < 20 ? 'WARNING' : 'NORMAL') : 'OFFLINE' },
    { name: 'Pneumatic Vessel',  value: data ? `${data.pneumaticPressurePsi.toFixed(1)} PSI` : '—', status: data ? (data.pneumaticPressurePsi < 95 || data.pneumaticPressurePsi > 145 ? 'WARNING' : 'NORMAL') : 'OFFLINE' },
    { name: 'Grid Interface',    value: data ? `${data.frequency.toFixed(2)} Hz` : '—', status: data && Math.abs(data.frequency - 50) < 0.5 ? 'NORMAL' : 'WARNING' },
    { name: 'Overall System',    value: data?.systemHealthStatus ?? 'OFFLINE', status: data?.systemHealthStatus ?? 'OFFLINE' },
  ];

  const netPower = data ? data.solarKw + data.bioenergyKw - data.loadKw : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Live Control Room</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Real-time microgrid telemetry · Updates every 2 seconds</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${connected ? 'bg-brand-500/15 text-brand-500' : 'bg-danger-500/15 text-danger-500'}`}>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-brand-500 animate-pulse' : 'bg-danger-500'}`} />
          {connected ? 'LIVE' : 'RECONNECTING...'}
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.slice(0, 2).map((alert, i) => (
        <AlertBanner key={i} level={alert?.level ?? 'info'} message={alert?.message ?? ''} />
      ))}

      {/* Animated Gauges Row */}
      <div className="card p-6">
        <h2 className="section-title mb-6">Live Instrument Panel</h2>
        <div className="flex flex-wrap justify-around gap-6">
          <AnimatedGauge
            value={data?.batterySoc ?? 0}
            label="Battery SoC"
            unit="%"
            warningThreshold={20}
            criticalThreshold={10}
            size={130}
          />
          <AnimatedGauge
            value={data?.batterySoh ?? 0}
            label="Battery SoH"
            unit="%"
            warningThreshold={80}
            criticalThreshold={70}
            size={130}
          />
          <AnimatedGauge
            value={data?.pneumaticPressurePsi ?? 0}
            min={60}
            max={180}
            label="Pressure"
            unit="PSI"
            warningThreshold={95}
            criticalThreshold={80}
            color="#8b5cf6"
            size={130}
          />
          <AnimatedGauge
            value={data?.powerFactor ? data.powerFactor * 100 : 0}
            label="Power Factor"
            unit="%"
            warningThreshold={92}
            criticalThreshold={85}
            color="#0ea5e9"
            size={130}
          />
          <AnimatedGauge
            value={data?.batteryTempC ?? 0}
            min={-10}
            max={60}
            label="Battery Temp"
            unit="°C"
            warningThreshold={40}
            criticalThreshold={50}
            color="#f97316"
            size={130}
          />
        </div>
      </div>

      {/* Power Flow + Subsystem Status */}
      <div className="grid lg:grid-cols-2 gap-6">
        <PowerFlowDiagram
          solar={data?.solarKw ?? 0}
          bioenergy={data?.bioenergyKw ?? 0}
          battery={netPower > 0 ? -netPower * 0.3 : netPower * 0.3}
          grid={data?.gridImportKw ?? 0}
          load={data?.loadKw ?? 0}
        />

        {/* Subsystem Status Panel */}
        <div className="card p-5">
          <h2 className="section-title mb-4">Subsystem Status</h2>
          <div className="space-y-2">
            {SUBSYSTEMS.map(sub => (
              <div key={sub.name} className="flex items-center justify-between p-3 rounded-lg transition-colors" style={{ background: 'var(--bg-tertiary)' }}>
                <div className="flex items-center gap-2.5">
                  <StatusDot status={sub.status} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{sub.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm tabular-nums font-mono" style={{ color: 'var(--text-secondary)' }}>{sub.value}</span>
                  <span className={`badge text-[10px] ${
                    sub.status === 'NORMAL' ? 'bg-success-500/10 text-success-500' :
                    sub.status === 'WARNING' ? 'bg-warning-500/10 text-warning-500' :
                    sub.status === 'CRITICAL' ? 'bg-danger-500/10 text-danger-500' : 'bg-surface-500/10 text-surface-400'
                  }`}>{sub.status}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Live metrics strip */}
          <div className="mt-4 pt-4 grid grid-cols-3 gap-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <div className="text-center">
              <p className="text-lg font-bold text-solar-500 tabular-nums">{data?.solarKw.toFixed(1) ?? '—'}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Solar kW</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-bio-500 tabular-nums">{data?.bioenergyKw.toFixed(1) ?? '—'}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Bio kW</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-warning-500 tabular-nums">{data?.loadKw.toFixed(1) ?? '—'}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Load kW</p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Time-Series Chart */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Live Telemetry Stream</h2>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Last {history.length} readings · 2s interval</span>
        </div>
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: 'var(--text-primary)' }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Solar" stroke="#eab308" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="Bioenergy" stroke="#22c55e" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="Load" stroke="#f97316" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="Grid Import" stroke="#8b5cf6" strokeWidth={1.5} dot={false} isAnimationActive={false} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-sm" style={{ color: 'var(--text-muted)' }}>
            Awaiting data stream...
          </div>
        )}
      </div>

      {/* Live data strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Frequency" value={data?.frequency?.toFixed(3) ?? '—'} unit="Hz" icon={<Activity size={16} />} color="text-accent-400" />
        <KpiCard title="Battery Voltage" value={data?.batteryVoltageV?.toFixed(1) ?? '—'} unit="V" icon={<Zap size={16} />} color="text-solar-400" />
        <KpiCard title="Battery Current" value={data?.batteryCurrentA?.toFixed(1) ?? '—'} unit="A" icon={<Battery size={16} />} color="text-battery-400" />
        <KpiCard title="Grid Export" value={data?.gridExportKw?.toFixed(1) ?? '—'} unit="kW" icon={<Gauge size={16} />} color="text-grid-400" />
      </div>
    </div>
  );
}
