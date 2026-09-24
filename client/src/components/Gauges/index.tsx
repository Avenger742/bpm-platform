/**
 * AnimatedGauge — SVG arc gauge for battery SoC, pressure, etc.
 */

interface GaugeProps {
  value: number;       // 0-100
  min?: number;
  max?: number;
  label: string;
  unit?: string;
  size?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  color?: string;
}

export function AnimatedGauge({
  value,
  min = 0,
  max = 100,
  label,
  unit = '%',
  size = 120,
  warningThreshold = 25,
  criticalThreshold = 10,
  color,
}: GaugeProps) {
  const radius = (size / 2) - 12;
  const cx = size / 2;
  const cy = size / 2;
  const startAngle = -215;
  const endAngle = 35;
  const totalAngle = endAngle - startAngle; // 250 degrees sweep

  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const sweepAngle = pct * totalAngle;
  const circumference = (totalAngle / 360) * 2 * Math.PI * radius;
  const arcLength = pct * circumference;

  function polarToCartesian(angleDeg: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  }

  function describeArc(from: number, to: number) {
    const s = polarToCartesian(from);
    const e = polarToCartesian(to);
    const large = to - from > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const trackColor = 'rgba(255,255,255,0.06)';
  let gaugeColor = color || '#00d97a';
  if (!color) {
    if (value <= criticalThreshold) gaugeColor = '#ef4444';
    else if (value <= warningThreshold) gaugeColor = '#f97316';
    else gaugeColor = '#00d97a';
  }

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.85} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
        {/* Track */}
        <path
          d={describeArc(startAngle, endAngle)}
          fill="none"
          stroke={trackColor}
          strokeWidth={8}
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d={describeArc(startAngle, startAngle + sweepAngle)}
          fill="none"
          stroke={gaugeColor}
          strokeWidth={8}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 6px ${gaugeColor}80)`,
            transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
        {/* Center value */}
        <text x={cx} y={cy - 4} textAnchor="middle" style={{ fill: gaugeColor, fontSize: size * 0.2, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
          {typeof value === 'number' ? value.toFixed(1) : value}
        </text>
        <text x={cx} y={cy + size * 0.12} textAnchor="middle" style={{ fill: 'var(--text-muted)', fontSize: size * 0.1 }}>
          {unit}
        </text>
      </svg>
      <p className="text-xs font-medium mt-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );
}

// ─── Power Flow Diagram ───────────────────────────────────────────────────────
interface PowerFlowNode {
  label: string;
  value: number;
  unit?: string;
  color: string;
  icon?: string;
}

interface PowerFlowProps {
  solar: number;
  bioenergy: number;
  battery: number;  // negative = charging, positive = discharging
  grid: number;     // negative = importing, positive = exporting
  load: number;
}

function FlowArrow({ direction, active, color }: { direction: 'right' | 'left' | 'down' | 'up'; active: boolean; color: string }) {
  return (
    <div className="flex items-center justify-center w-10 h-10">
      {active ? (
        <span
          className={`text-lg font-bold flow-${direction}`}
          style={{ color, textShadow: `0 0 8px ${color}` }}
        >
          {direction === 'right' ? '→' : direction === 'left' ? '←' : direction === 'down' ? '↓' : '↑'}
        </span>
      ) : (
        <span className="text-surface-600 text-lg">·</span>
      )}
    </div>
  );
}

function NodeCard({ label, value, unit = 'kW', color }: PowerFlowNode) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-[80px]">
      <div
        className="w-16 h-16 rounded-xl flex flex-col items-center justify-center shadow-lg"
        style={{ background: `${color}20`, border: `1.5px solid ${color}60` }}
      >
        <span className="text-base font-bold tabular-nums" style={{ color }}>
          {value.toFixed(1)}
        </span>
        <span className="text-[9px]" style={{ color: `${color}99` }}>{unit}</span>
      </div>
      <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>
    </div>
  );
}

export function PowerFlowDiagram({ solar, bioenergy, battery, grid, load }: PowerFlowProps) {
  const solarColor    = '#eab308';
  const bioColor      = '#22c55e';
  const batteryColor  = '#0ea5e9';
  const gridColor     = '#8b5cf6';
  const loadColor     = '#f97316';

  return (
    <div className="card p-6">
      <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Real-Time Power Flow</p>
      <div className="flex flex-col items-center gap-2">
        {/* Top row: Solar + Bio → Bus */}
        <div className="flex items-center gap-3">
          <NodeCard label="Solar" value={solar} color={solarColor} />
          <FlowArrow direction="right" active={solar > 1} color={solarColor} />
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center shadow-glow-green font-bold text-xs text-center"
            style={{ background: 'rgba(0,217,122,0.15)', border: '2px solid #00d97a', color: '#00d97a' }}
          >
            AC<br/>BUS
          </div>
          <FlowArrow direction="right" active={load > 1} color={loadColor} />
          <NodeCard label="Loads" value={load} color={loadColor} />
        </div>
        {/* Middle row arrows */}
        <div className="flex items-center gap-3 ml-[-124px]">
          <div className="w-16" />
          <div className="w-10" />
          <div className="flex flex-col items-center gap-1">
            <FlowArrow direction={battery < 0 ? 'down' : 'up'} active={Math.abs(battery) > 0.5} color={batteryColor} />
            <FlowArrow direction={grid < 0 ? 'up' : 'down'} active={Math.abs(grid) > 0.5} color={gridColor} />
          </div>
        </div>
        {/* Bottom row: Bio + Battery + Grid */}
        <div className="flex items-center gap-4 ml-[-120px]">
          <NodeCard label="Bioenergy" value={bioenergy} color={bioColor} />
          <FlowArrow direction="right" active={bioenergy > 1} color={bioColor} />
          <div className="flex flex-col gap-3">
            <NodeCard label={battery < 0 ? 'Battery ↓' : 'Battery ↑'} value={Math.abs(battery)} color={batteryColor} />
            <NodeCard label={grid < 0 ? 'Grid Import' : 'Grid Export'} value={Math.abs(grid)} color={gridColor} />
          </div>
        </div>
      </div>
    </div>
  );
}
