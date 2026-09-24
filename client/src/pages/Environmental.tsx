import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/hooks/useApi';
import { SectionHeader, PageLoader } from '@/components/UI';
import { Leaf, Wind, Factory, Download, CheckCircle } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

interface Summary {
  totals: { solarKwh: number; bioenergyKwh: number; gridImportKwh: number; };
  averages: { batterySoc: number; };
  count: number;
}

const CO2_FACTOR = 0.42; // kg CO2 per kWh avoided
const BIOMASS_FACTOR = 2.8; // kg biomass per kWh bioenergy

export default function EnvironmentalPage() {
  const { token } = useAuth();
  const [summary30d, setSummary30d] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch<Summary>('/api/telemetry/summary?period=30d', token)
      .then(setSummary30d)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `BPM-ESG-Report-${new Date().toISOString().slice(0, 10)}`,
  });

  const totalRenewableKwh = (summary30d?.totals.solarKwh ?? 0) + (summary30d?.totals.bioenergyKwh ?? 0);
  const co2AvoidedKg = totalRenewableKwh * CO2_FACTOR;
  const biomassUsedKg = (summary30d?.totals.bioenergyKwh ?? 0) * BIOMASS_FACTOR;
  const renewablePct = totalRenewableKwh > 0 && summary30d
    ? Math.round((totalRenewableKwh / (totalRenewableKwh + summary30d.totals.gridImportKwh)) * 100)
    : 0;

  const SDG_TARGETS = [
    {
      sdg: 'SDG 7',
      title: 'Affordable & Clean Energy',
      color: '#f59e0b',
      metrics: [
        { label: 'Renewable Energy Share', value: `${renewablePct}%`, target: '>75%', met: renewablePct >= 75 },
        { label: 'Total Clean Generation', value: `${(totalRenewableKwh / 1000).toFixed(1)} MWh`, target: '>100 MWh/month', met: totalRenewableKwh >= 100000 },
        { label: 'Grid Import Reduction', value: `${(summary30d?.totals.gridImportKwh ?? 0 / 1000).toFixed(1)} MWh`, target: '<50 MWh/month', met: (summary30d?.totals.gridImportKwh ?? 999) < 50000 },
      ],
    },
    {
      sdg: 'SDG 13',
      title: 'Climate Action',
      color: '#22c55e',
      metrics: [
        { label: 'CO₂ Emissions Avoided', value: `${(co2AvoidedKg / 1000).toFixed(2)} tCO₂e`, target: '>30 tCO₂e/month', met: co2AvoidedKg >= 30000 },
        { label: 'Biomass Waste Diverted', value: `${(biomassUsedKg / 1000).toFixed(1)} tonnes`, target: 'All waste stream', met: true },
        { label: 'Carbon Intensity', value: `${totalRenewableKwh > 0 ? (co2AvoidedKg / totalRenewableKwh * 1000).toFixed(0) : '0'} gCO₂/kWh saved`, target: 'Net positive', met: co2AvoidedKg > 0 },
      ],
    },
  ];

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Environmental Impact & ESG</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>30-day sustainability metrics · SDG 7 & SDG 13 compliance reporting</p>
        </div>
        <button
          id="export-esg-report"
          onClick={handlePrint}
          className="btn-primary gap-2"
        >
          <Download size={14} /> Export ESG Report (PDF)
        </button>
      </div>

      {/* Hero KPIs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'CO₂ Avoided',
            value: (co2AvoidedKg / 1000).toFixed(2),
            unit: 'tCO₂e',
            icon: <Wind size={20} />,
            color: '#22c55e',
            subtitle: '30-day total',
          },
          {
            label: 'Renewable Generation',
            value: (totalRenewableKwh / 1000).toFixed(1),
            unit: 'MWh',
            icon: <Leaf size={20} />,
            color: '#00d97a',
            subtitle: 'Solar + Bioenergy',
          },
          {
            label: 'Biomass Waste Utilized',
            value: (biomassUsedKg / 1000).toFixed(1),
            unit: 'tonnes',
            icon: <Factory size={20} />,
            color: '#eab308',
            subtitle: 'Diverted from landfill',
          },
          {
            label: 'Renewable Share',
            value: renewablePct,
            unit: '%',
            icon: <CheckCircle size={20} />,
            color: '#0ea5e9',
            subtitle: 'of total energy consumed',
          },
        ].map(kpi => (
          <div key={kpi.label} className="card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${kpi.color}20` }}>
                <span style={{ color: kpi.color }}>{kpi.icon}</span>
              </div>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{kpi.label}</p>
            </div>
            <div className="flex items-end gap-1">
              <span className="text-3xl font-bold tabular-nums" style={{ color: kpi.color }}>{kpi.value}</span>
              <span className="text-sm pb-1" style={{ color: 'var(--text-muted)' }}>{kpi.unit}</span>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{kpi.subtitle}</p>
          </div>
        ))}
      </div>

      {/* SDG Cards */}
      <div className="grid lg:grid-cols-2 gap-6">
        {SDG_TARGETS.map(sdg => (
          <div key={sdg.sdg} className="card p-5" style={{ borderTop: `3px solid ${sdg.color}` }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm text-white" style={{ background: sdg.color }}>
                {sdg.sdg}
              </div>
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{sdg.title}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>UN Sustainable Development Goal</p>
              </div>
            </div>
            <div className="space-y-3">
              {sdg.metrics.map(m => (
                <div key={m.label} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{m.label}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Target: {m.target}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-sm" style={{ color: sdg.color }}>{m.value}</span>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${m.met ? 'bg-success-500/20 text-success-500' : 'bg-danger-500/20 text-danger-500'}`}>
                      {m.met ? '✓' : '✗'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Printable ESG Report */}
      <div ref={printRef} className="print:block">
        <div className="card p-6 print:shadow-none print:border-0">
          <div className="print:block">
            <div className="flex items-center justify-between mb-6 pb-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>ESG Compliance Report</h2>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>BPM Platform · {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Reporting Period: 30 Days</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-brand-500 text-lg">BPM Platform v1.0</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Hybrid Solar-Bioenergy Microgrid</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                { label: 'Total Renewable Generation', value: `${(totalRenewableKwh / 1000).toFixed(2)} MWh` },
                { label: 'Solar Generation', value: `${(summary30d?.totals.solarKwh ?? 0 / 1000).toFixed(2)} MWh` },
                { label: 'Bioenergy Generation', value: `${(summary30d?.totals.bioenergyKwh ?? 0 / 1000).toFixed(2)} MWh` },
                { label: 'Grid Import', value: `${(summary30d?.totals.gridImportKwh ?? 0 / 1000).toFixed(2)} MWh` },
                { label: 'CO₂ Emissions Avoided', value: `${(co2AvoidedKg / 1000).toFixed(3)} tCO₂e` },
                { label: 'Biomass Waste Diverted from Landfill', value: `${(biomassUsedKg / 1000).toFixed(2)} tonnes` },
                { label: 'Renewable Energy Share', value: `${renewablePct}%` },
                { label: 'Average Battery SoC', value: `${summary30d?.averages.batterySoc?.toFixed(1) ?? '—'}%` },
              ].map(item => (
                <div key={item.label} className="flex justify-between p-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                  <span className="text-sm font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>{item.value}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              This report is automatically generated from live telemetry data. Figures represent aggregated 30-day averages and totals.
              Compliance mapping follows UN SDG framework indicators 7.2.1 and 13.2.2. Generated: {new Date().toISOString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
