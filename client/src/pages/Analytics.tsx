import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/hooks/useApi';
import { SectionHeader, PageLoader } from '@/components/UI';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { format, subDays } from 'date-fns';

interface TelemetryRecord {
  timestamp: string;
  solarKw: number;
  bioenergyKw: number;
  loadKw: number;
  gridImportKw: number;
  gridExportKw: number;
  batterySoc: number;
}

interface TariffRecord {
  id: string;
  name: string;
  peakRate: number;
  offPeakRate: number;
  shoulderRate: number;
  demandChargeKw: number;
}

const PERIODS: { label: string; value: string; days: number }[] = [
  { label: '24h', value: '24h', days: 1 },
  { label: '7 Days', value: '7d', days: 7 },
  { label: '30 Days', value: '30d', days: 30 },
];

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [period, setPeriod] = useState('7d');
  const [telemetry, setTelemetry] = useState<TelemetryRecord[]>([]);
  const [tariffs, setTariffs] = useState<TariffRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    const days = PERIODS.find(p => p.value === period)?.days ?? 7;
    const from = subDays(new Date(), days).toISOString();
    const limit = days <= 1 ? 288 : days <= 7 ? 168 : 720;

    Promise.all([
      apiFetch<{ data: TelemetryRecord[] }>(`/api/telemetry?from=${from}&limit=${limit}`, token),
      apiFetch<TariffRecord[]>('/api/tariffs', token),
    ]).then(([tel, tar]) => {
      // Downsample for chart performance
      const raw = [...tel.data].reverse();
      const step = Math.max(1, Math.floor(raw.length / 120));
      setTelemetry(raw.filter((_, i) => i % step === 0));
      setTariffs(tar);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [token, period]);

  const chartData = telemetry.map(r => ({
    time: format(new Date(r.timestamp), period === '24h' ? 'HH:mm' : 'MM/dd HH:mm'),
    Solar: +r.solarKw.toFixed(1),
    Bioenergy: +r.bioenergyKw.toFixed(1),
    Load: +r.loadKw.toFixed(1),
    'Grid Import': +r.gridImportKw.toFixed(1),
    'Grid Export': +r.gridExportKw.toFixed(1),
  }));

  // ── Financial / ROI Calculator ──────────────────────────────────────────────
  const activeTariff = tariffs[0];
  const totalSolarKwh = telemetry.reduce((s, r) => s + r.solarKw, 0) / 2; // Approx kWh
  const totalBioKwh   = telemetry.reduce((s, r) => s + r.bioenergyKw, 0) / 2;
  const totalGridKwh  = telemetry.reduce((s, r) => s + r.gridImportKw, 0) / 2;

  const peakHours = telemetry.filter(r => {
    const h = new Date(r.timestamp).getHours();
    return h >= 9 && h <= 17;
  });
  const offPeakHours = telemetry.filter(r => {
    const h = new Date(r.timestamp).getHours();
    return h < 9 || h > 17;
  });

  const peakKwh    = peakHours.reduce((s, r) => s + r.solarKw + r.bioenergyKw, 0) / 2;
  const offPeakKwh = offPeakHours.reduce((s, r) => s + r.solarKw + r.bioenergyKw, 0) / 2;

  const peakSavings    = activeTariff ? peakKwh * activeTariff.peakRate : 0;
  const offPeakSavings = activeTariff ? offPeakKwh * activeTariff.offPeakRate : 0;
  const totalSavings   = peakSavings + offPeakSavings;
  const monthlySavings = totalSavings / (PERIODS.find(p => p.value === period)?.days ?? 7) * 30;

  // Daily breakdown for bar chart
  const DAYS_COUNT = Math.min(PERIODS.find(p => p.value === period)?.days ?? 7, 30);
  const dailyData = Array.from({ length: DAYS_COUNT }, (_, i) => {
    const date = subDays(new Date(), DAYS_COUNT - 1 - i);
    const dayStr = format(date, 'MM/dd');
    const dayRecs = telemetry.filter(r =>
      format(new Date(r.timestamp), 'MM/dd') === dayStr
    );
    const gen = dayRecs.reduce((s, r) => s + r.solarKw + r.bioenergyKw, 0) / 2;
    const load = dayRecs.reduce((s, r) => s + r.loadKw, 0) / 2;
    const savings = activeTariff ? gen * activeTariff.peakRate * 0.6 : gen * 0.18;
    return {
      date: format(date, 'MM/dd'),
      'Generation (kWh)': +gen.toFixed(1),
      'Load (kWh)': +load.toFixed(1),
      'Savings ($)': +savings.toFixed(2),
    };
  }).filter(d => d['Generation (kWh)'] > 0);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Energy Analytics</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Historical generation, load profiles, and financial performance</p>
        </div>
        {/* Period Selector */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
          {PERIODS.map(p => (
            <button
              key={p.value}
              id={`period-${p.value}`}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium transition-all ${
                period === p.value
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'hover:bg-[var(--border-color)]'
              }`}
              style={{ color: period === p.value ? undefined : 'var(--text-secondary)' }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Generation Mix Area Chart */}
      <div className="card p-5">
        <SectionHeader title="Generation & Load Profile" subtitle={`${period} historical trend`} />
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
            <defs>
              <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="bioGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="loadGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} unit=" kW" />
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="Solar" stroke="#eab308" fill="url(#solarGrad)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="Bioenergy" stroke="#22c55e" fill="url(#bioGrad)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="Load" stroke="#f97316" fill="url(#loadGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Daily Generation + Savings Bar Chart */}
      <div className="card p-5">
        <SectionHeader title="Daily Energy Balance & Savings" subtitle="Daily kWh generation vs load and estimated cost savings" />
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={dailyData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} unit="$" />
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="left" dataKey="Generation (kWh)" fill="#00d97a" radius={[3, 3, 0, 0]} opacity={0.85} />
            <Bar yAxisId="left" dataKey="Load (kWh)" fill="#f97316" radius={[3, 3, 0, 0]} opacity={0.7} />
            <Bar yAxisId="right" dataKey="Savings ($)" fill="#0ea5e9" radius={[3, 3, 0, 0]} opacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Financial ROI Calculator */}
      <div className="card p-5">
        <SectionHeader title="Tariff / ROI Calculator" subtitle="Estimated cost savings from on-site generation vs. utility grid rates" />
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Tariff Config */}
          <div>
            <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
              Active Tariff: {activeTariff?.name ?? 'N/A'}
            </p>
            <div className="space-y-2">
              {activeTariff && [
                { label: 'Peak Rate', value: `$${activeTariff.peakRate.toFixed(3)}/kWh`, color: 'text-danger-400' },
                { label: 'Off-Peak Rate', value: `$${activeTariff.offPeakRate.toFixed(3)}/kWh`, color: 'text-success-400' },
                { label: 'Shoulder Rate', value: `$${activeTariff.shoulderRate.toFixed(3)}/kWh`, color: 'text-warning-400' },
                { label: 'Demand Charge', value: `$${activeTariff.demandChargeKw.toFixed(2)}/kW/month`, color: 'text-grid-400' },
              ].map(item => (
                <div key={item.label} className="flex justify-between px-3 py-2 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                  <span className={`text-sm font-semibold tabular-nums font-mono ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Savings Summary */}
          <div className="space-y-3">
            {[
              { label: `Total Renewable Gen. (${period})`, value: `${(totalSolarKwh + totalBioKwh).toFixed(0)} kWh`, color: 'text-brand-500' },
              { label: `Grid Import (${period})`, value: `${totalGridKwh.toFixed(0)} kWh`, color: 'text-grid-400' },
              { label: 'Peak-Hour Savings', value: `$${peakSavings.toFixed(2)}`, color: 'text-success-500' },
              { label: 'Off-Peak Savings', value: `$${offPeakSavings.toFixed(2)}`, color: 'text-success-400' },
              { label: `Total Savings (${period})`, value: `$${totalSavings.toFixed(2)}`, color: 'text-brand-500', bold: true },
              { label: 'Projected Monthly Savings', value: `$${monthlySavings.toFixed(2)}/mo`, color: 'text-brand-400', bold: true },
            ].map(item => (
              <div key={item.label} className={`flex justify-between px-3 py-2.5 rounded-lg ${item.bold ? 'ring-1 ring-brand-500/30' : ''}`} style={{ background: 'var(--bg-tertiary)' }}>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                <span className={`text-sm font-semibold tabular-nums font-mono ${item.color} ${item.bold ? 'text-base' : ''}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
