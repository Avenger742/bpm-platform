import { useState } from 'react';
import { BookOpen, Zap, ChevronDown, ChevronUp, Sun, Leaf, Battery, Grid, Phone, Mail, ExternalLink } from 'lucide-react';

const GLOSSARY = [
  { term: 'SoC — State of Charge', def: 'The percentage of remaining usable energy in a battery relative to its total capacity. A SoC of 100% indicates a fully charged battery.' },
  { term: 'SoH — State of Health', def: 'A measure of a battery\'s ability to deliver its rated capacity versus when it was new. Degradation from 100% to ~80% typically indicates end-of-useful-life for energy storage.' },
  { term: 'MPPT — Maximum Power Point Tracking', def: 'An algorithm used in solar inverters to continuously find and operate at the optimal voltage/current point where the solar array produces maximum power output.' },
  { term: 'Bioenergy / Biopower', def: 'Electrical energy generated from biological sources (biomass). In this system, organic waste materials are converted to electricity via controlled combustion or gasification.' },
  { term: 'Microgrid', def: 'A localized group of distributed energy resources (solar, bioenergy, battery storage) that can operate connected to the utility grid or independently (islanded mode).' },
  { term: 'TOD / TOU — Time-of-Use', def: 'A utility pricing structure where electricity costs vary based on time of day. Peak hours (typically 9am–5pm) carry higher rates than off-peak (overnight) periods.' },
  { term: 'ESG — Environmental, Social, Governance', def: 'A framework for measuring an organization\'s sustainability and ethical impact. The BPM Platform tracks SDG 7 (Clean Energy) and SDG 13 (Climate Action) metrics.' },
  { term: 'CO₂e — Carbon Dioxide Equivalent', def: 'A standard unit for measuring all greenhouse gases in terms of the amount of CO₂ that would have the equivalent global warming impact.' },
  { term: 'DNO — Distribution Network Operator', def: 'The company responsible for operating the electricity distribution network in your region. DNOs may request export curtailment during periods of local grid congestion.' },
  { term: 'Pneumatic Accumulator', def: 'A pressure vessel used to store compressed gas energy in the microgrid system. Pressure monitoring ensures safe operation within defined PSI bounds.' },
];

const SYSTEM_SECTIONS = [
  {
    icon: <Sun size={18} />,
    color: '#eab308',
    title: 'Solar Array Subsystem',
    content: 'The photovoltaic array generates DC power which is converted to AC via string inverters with MPPT. Output follows a sinusoidal daily curve, peaking at solar noon (~80–90 kW peak). The array is monitored for soiling, shading, and inverter faults via telemetry comparison against expected irradiance curves.',
  },
  {
    icon: <Leaf size={18} />,
    color: '#22c55e',
    title: 'Bioenergy Generator',
    content: 'A biomass gasification unit converts organic agricultural and industrial waste into syngas, which drives a generator providing a steady 40–55 kW baseload. This subsystem provides essential firm power during night hours when solar generation is zero, ensuring 24/7 renewable energy availability.',
  },
  {
    icon: <Battery size={18} />,
    color: '#0ea5e9',
    title: 'Battery Energy Storage System (BESS)',
    content: 'A lithium iron phosphate (LFP) battery bank provides energy buffering. It charges when renewable generation exceeds load and discharges to cover deficits. The BESS is monitored for SoC, SoH, cycle count, voltage, current, and temperature across all cell groups. Degradation is tracked and projected for CapEx planning.',
  },
  {
    icon: <Grid size={18} />,
    color: '#8b5cf6',
    title: 'Grid Interface',
    content: 'A bidirectional grid connection allows importing power when on-site generation is insufficient and exporting excess renewable generation under approved Power Purchase Agreements (PPAs). The system monitors frequency, power factor, and curtailment requirements from the Distribution Network Operator (DNO).',
  },
];

const SUPPORT = [
  { name: 'Technical Operations', email: 'ops@bpmplatform.io', phone: '+1 (555) 012-3456', hours: '24/7 Emergency line' },
  { name: 'ESG & Compliance', email: 'esg@bpmplatform.io', phone: '+1 (555) 012-3457', hours: 'Mon–Fri 09:00–17:00' },
  { name: 'Platform Support', email: 'support@bpmplatform.io', phone: '+1 (555) 012-3458', hours: 'Mon–Fri 08:00–20:00' },
];

function AccordionItem({ term, def }: { term: string; def: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b last:border-b-0" style={{ borderColor: 'var(--border-color)' }}>
      <button
        className="w-full flex items-center justify-between py-3 px-4 text-left hover:bg-[var(--bg-tertiary)] transition-colors rounded-lg"
        onClick={() => setOpen(v => !v)}
        id={`glossary-${term.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{term}</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <p className="px-4 pb-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{def}</p>
      )}
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="space-y-8 animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center shadow-glow-green">
          <Zap size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>About BPM Platform</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Technical documentation, system architecture, and support resources</p>
        </div>
      </div>

      {/* Overview */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={18} className="text-brand-500" />
          <h2 className="section-title">Platform Overview</h2>
        </div>
        <div className="space-y-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <p>
            The <strong style={{ color: 'var(--text-primary)' }}>Biomass & Power Management (BPM) Platform</strong> is an industrial-grade SCADA-level
            web application for monitoring, controlling, and optimizing hybrid solar-bioenergy microgrids. It provides
            real-time telemetry, predictive maintenance, energy analytics, and ESG compliance reporting in a single unified interface.
          </p>
          <p>
            The platform integrates three primary renewable sources—photovoltaic solar arrays, biomass-fueled generators, and
            lithium battery storage—with utility grid connectivity, providing operators with complete visibility and control over
            energy flows, financial performance, and environmental impact.
          </p>
        </div>
      </div>

      {/* Subsystem Documentation */}
      <div className="card p-6">
        <h2 className="section-title mb-5">System Architecture</h2>
        <div className="grid lg:grid-cols-2 gap-4">
          {SYSTEM_SECTIONS.map(s => (
            <div key={s.title} className="p-4 rounded-xl" style={{ background: 'var(--bg-tertiary)', borderLeft: `3px solid ${s.color}` }}>
              <div className="flex items-center gap-2 mb-2">
                <span style={{ color: s.color }}>{s.icon}</span>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{s.title}</h3>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{s.content}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tech Stack */}
      <div className="card p-6">
        <h2 className="section-title mb-4">Technology Stack</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { layer: 'Backend', tech: 'Node.js + Express + TypeScript', color: '#22c55e' },
            { layer: 'Database', tech: 'Prisma ORM + PostgreSQL / SQLite', color: '#0ea5e9' },
            { layer: 'Real-Time', tech: 'WebSocket (ws) · 2s telemetry intervals', color: '#f97316' },
            { layer: 'Frontend', tech: 'React 18 + Vite + TypeScript', color: '#eab308' },
            { layer: 'Styling', tech: 'Tailwind CSS + CSS Variables (3 themes)', color: '#8b5cf6' },
            { layer: 'Charts', tech: 'Recharts · Area, Line, Bar charts', color: '#00d97a' },
            { layer: 'Auth', tech: 'JWT + httpOnly cookies + RBAC (3 roles)', color: '#ef4444' },
            { layer: 'Deployment', tech: 'Docker · Render · Railway · Cloud Run', color: '#64748b' },
          ].map(item => (
            <div key={item.layer} className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: item.color }}>{item.layer}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.tech}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Glossary */}
      <div className="card p-6">
        <h2 className="section-title mb-4">Glossary of Terms</h2>
        <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
          {GLOSSARY.map(item => (
            <AccordionItem key={item.term} term={item.term} def={item.def} />
          ))}
        </div>
      </div>

      {/* Support Directory */}
      <div className="card p-6">
        <h2 className="section-title mb-4">Technical Support Directory</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {SUPPORT.map(s => (
            <div key={s.name} className="p-4 rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
              <p className="font-semibold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{s.hours}</p>
              <a href={`mailto:${s.email}`} className="flex items-center gap-1 text-xs text-brand-500 hover:underline mt-2">
                <Mail size={11} /> {s.email}
              </a>
              <div className="flex items-center gap-1 text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                <Phone size={11} /> {s.phone}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Version info */}
      <div className="text-center py-4">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          BPM Platform v1.0.0 · Built with ❤️ for sustainable energy management ·{' '}
          <a href="#" className="text-brand-500 hover:underline inline-flex items-center gap-0.5">
            Documentation <ExternalLink size={10} />
          </a>
        </p>
      </div>
    </div>
  );
}
