import { useEffect, useState } from 'react';
import { Zap, Battery, Wind, Activity, AlertTriangle, TrendingUp, Sun, Leaf } from 'lucide-react';
import { KpiCard, AlertBanner, StatusDot } from '@/components/UI';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/hooks/useApi';

interface TicketSummary {
  id: string;
  ticketCode: string;
  title: string;
  severity: string;
  status: string;
  subsystem: string;
  createdAt: string;
}

interface SummaryData {
  averages: {
    solarKw: number;
    bioenergyKw: number;
    loadKw: number;
    batterySoc: number;
    gridImportKw: number;
    gridExportKw: number;
  };
  totals: {
    solarKwh: number;
    bioenergyKwh: number;
    gridImportKwh: number;
  };
  count: number;
}

export default function HomePage() {
  const { data, alerts, connected } = useWebSocket();
  const { token, user } = useAuth();
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<number[]>([]);

  useEffect(() => {
    if (!token) return;
    apiFetch<SummaryData>('/api/telemetry/summary?period=24h', token).then(setSummary).catch(() => {});
    apiFetch<TicketSummary[]>('/api/tickets?status=NEW', token).then(setTickets).catch(() => {});
  }, [token]);

  const live = data;
  const renewablePct = live
    ? Math.round(((live.solarKw + live.bioenergyKw) / Math.max(live.loadKw, 1)) * 100)
    : 0;
  const co2Avoided = summary
    ? ((summary.totals.solarKwh + summary.totals.bioenergyKwh) * 0.42).toFixed(0)
    : '—';

  const SUSTAINABILITY_TARGETS = [
    { label: 'Renewable Share Target', value: renewablePct, target: 75, color: '#00d97a' },
    { label: 'Battery SoC', value: live?.batterySoc ?? 0, target: 20, color: '#0ea5e9', minGood: true },
    { label: 'Grid Export Efficiency', value: summary ? Math.round((summary.averages.gridExportKw / 60) * 100) : 0, target: 30, color: '#8b5cf6' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Good {getTimeOfDay()}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Hybrid Microgrid System Overview · {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Live alerts ticker */}
      {alerts.filter((_, i) => !dismissedAlerts.includes(i)).slice(0, 3).map((alert, i) => (
        <AlertBanner
          key={i}
          level={alert?.level ?? 'info'}
          message={alert?.message ?? ''}
          onDismiss={() => setDismissedAlerts(prev => [...prev, i])}
        />
      ))}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Solar Generation"
          value={live?.solarKw.toFixed(1) ?? '—'}
          unit="kW"
          icon={<Sun size={18} />}
          color="text-solar-500"
          subtitle="Live output"
        />
        <KpiCard
          title="Bioenergy Output"
          value={live?.bioenergyKw.toFixed(1) ?? '—'}
          unit="kW"
          icon={<Leaf size={18} />}
          color="text-bio-500"
          subtitle="Baseload"
        />
        <KpiCard
          title="Battery SoC"
          value={live?.batterySoc.toFixed(1) ?? '—'}
          unit="%"
          icon={<Battery size={18} />}
          color={live && live.batterySoc < 20 ? 'text-danger-500' : 'text-battery-500'}
          subtitle={`SoH: ${live?.batterySoh.toFixed(1) ?? '—'}%`}
        />
        <KpiCard
          title="Facility Load"
          value={live?.loadKw.toFixed(1) ?? '—'}
          unit="kW"
          icon={<Zap size={18} />}
          color="text-warning-500"
          subtitle="Total demand"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Renewable Share"
          value={`${Math.min(renewablePct, 999)}`}
          unit="%"
          icon={<Wind size={18} />}
          color="text-brand-500"
          subtitle="Solar + Bioenergy / Load"
        />
        <KpiCard
          title="Grid Import"
          value={live?.gridImportKw.toFixed(1) ?? '—'}
          unit="kW"
          icon={<Activity size={18} />}
          color="text-grid-500"
          subtitle="Utility draw"
        />
        <KpiCard
          title="CO₂ Avoided (24h)"
          value={co2Avoided}
          unit="kg"
          icon={<Leaf size={18} />}
          color="text-brand-500"
          subtitle="vs. grid baseline"
        />
        <KpiCard
          title="Open Tickets"
          value={tickets.length}
          icon={<AlertTriangle size={18} />}
          color={tickets.length > 3 ? 'text-danger-500' : 'text-warning-500'}
          subtitle="Require attention"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* System Status */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">System Health</h2>
            <div className="flex items-center gap-2">
              <StatusDot status={live?.systemHealthStatus ?? 'OFFLINE'} />
              <span className={`text-sm font-semibold ${
                live?.systemHealthStatus === 'NORMAL' ? 'text-success-500' :
                live?.systemHealthStatus === 'WARNING' ? 'text-warning-500' : 'text-danger-500'
              }`}>{live?.systemHealthStatus ?? 'OFFLINE'}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: 'Solar Array',       status: (live?.solarKw ?? 0) > 0 ? 'NORMAL' : 'WARNING',  value: `${live?.solarKw?.toFixed(1) ?? '—'} kW` },
              { name: 'Bioenergy Gen.',    status: (live?.bioenergyKw ?? 0) > 35 ? 'NORMAL' : 'WARNING', value: `${live?.bioenergyKw?.toFixed(1) ?? '—'} kW` },
              { name: 'Battery Storage',   status: (live?.batterySoc ?? 100) < 10 ? 'CRITICAL' : (live?.batterySoc ?? 100) < 20 ? 'WARNING' : 'NORMAL', value: `${live?.batterySoc?.toFixed(1) ?? '—'}%` },
              { name: 'Pneumatic Vessel',  status: (live?.pneumaticPressurePsi ?? 110) < 95 || (live?.pneumaticPressurePsi ?? 110) > 145 ? 'WARNING' : 'NORMAL', value: `${live?.pneumaticPressurePsi?.toFixed(1) ?? '—'} PSI` },
              { name: 'Grid Connection',   status: (live?.gridImportKw ?? 0) > 70 ? 'CRITICAL' : 'NORMAL', value: `${live?.gridImportKw?.toFixed(1) ?? '—'} kW import` },
              { name: 'WebSocket Feed',    status: connected ? 'NORMAL' : 'CRITICAL', value: connected ? 'Connected' : 'Disconnected' },
            ].map(subsystem => (
              <div key={subsystem.name} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div className="flex items-center gap-2">
                  <StatusDot status={subsystem.status} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{subsystem.name}</span>
                </div>
                <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>{subsystem.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sustainability Targets */}
        <div className="card p-5">
          <h2 className="section-title mb-4">Sustainability Targets</h2>
          <div className="space-y-4">
            {SUSTAINABILITY_TARGETS.map(t => {
              const pct = t.minGood
                ? Math.round((t.value / 100) * 100)
                : Math.round((t.value / 100) * 100);
              const barWidth = Math.min(t.value, 100);
              return (
                <div key={t.label}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{t.label}</span>
                    <span className="text-xs font-bold tabular-nums" style={{ color: t.color }}>{t.value.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${barWidth}%`,
                        background: t.color,
                        boxShadow: `0 0 8px ${t.color}60`,
                      }}
                    />
                  </div>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Target: {t.target}%</p>
                </div>
              );
            })}
          </div>

          {/* Stats grid */}
          <div className="mt-5 pt-4 border-t grid grid-cols-2 gap-3" style={{ borderColor: 'var(--border-color)' }}>
            <div className="text-center">
              <p className="text-xl font-bold text-brand-500">
                {summary ? ((summary.totals.solarKwh + summary.totals.bioenergyKwh) / 1000).toFixed(1) : '—'}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>MWh Generated (24h)</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-accent-400">
                {live?.batteryCycles ?? '—'}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Battery Cycles</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Tickets */}
      {tickets.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">Open Maintenance Tickets</h2>
            <a href="/alerts" className="text-sm text-brand-500 hover:text-brand-400">View all →</a>
          </div>
          <div className="space-y-2">
            {tickets.slice(0, 4).map(ticket => (
              <div key={ticket.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <AlertTriangle size={14} className={
                  ticket.severity === 'CRITICAL' ? 'text-danger-500' :
                  ticket.severity === 'HIGH' ? 'text-orange-500' : 'text-warning-500'
                } />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{ticket.title}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{ticket.ticketCode} · {ticket.subsystem}</p>
                </div>
                <span className={`badge ${
                  ticket.severity === 'CRITICAL' ? 'severity-critical' :
                  ticket.severity === 'HIGH' ? 'severity-high' : 'severity-medium'
                }`}>{ticket.severity}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
