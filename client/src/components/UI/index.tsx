// Shared UI primitives for BPM Platform

import React from 'react';

// ─── Badge ────────────────────────────────────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'normal' | 'warning' | 'critical' | 'offline' | 'low' | 'medium' | 'high' | 'critical-sev';
  className?: string;
}

export function Badge({ children, variant = 'normal', className = '' }: BadgeProps) {
  const cls = {
    normal:       'badge bg-success-500/15 text-success-500',
    warning:      'badge bg-warning-500/15 text-warning-500',
    critical:     'badge bg-danger-500/15 text-danger-500',
    offline:      'badge bg-surface-500/15 text-surface-400',
    low:          'badge bg-success-500/15 text-success-500',
    medium:       'badge bg-warning-500/15 text-warning-600',
    high:         'badge bg-orange-500/15 text-orange-500',
    'critical-sev': 'badge bg-danger-500/15 text-danger-500 animate-pulse',
  }[variant];
  return <span className={`${cls} ${className}`}>{children}</span>;
}

// ─── Status Dot ───────────────────────────────────────────────────────────────
export function StatusDot({ status }: { status: string }) {
  const color = {
    NORMAL: 'bg-success-500',
    WARNING: 'bg-warning-500',
    CRITICAL: 'bg-danger-500',
    OFFLINE: 'bg-surface-400',
  }[status] ?? 'bg-surface-400';

  return (
    <span className="relative flex items-center justify-center w-3 h-3">
      <span className={`absolute inline-flex w-full h-full rounded-full opacity-40 ${color} ${status !== 'NORMAL' && status !== 'OFFLINE' ? 'animate-ping' : ''}`} />
      <span className={`relative w-2 h-2 rounded-full ${color}`} />
    </span>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: { value: number; positive?: boolean };
  color?: string;
  className?: string;
}

export function KpiCard({ title, value, unit, subtitle, icon, trend, color = 'text-brand-500', className = '' }: KpiCardProps) {
  return (
    <div className={`card p-4 flex flex-col gap-3 ${className}`}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{title}</p>
        {icon && <span className={`${color}`}>{icon}</span>}
      </div>
      <div>
        <div className="flex items-end gap-1">
          <span className={`text-2xl font-bold tabular-nums ${color}`}>{value}</span>
          {unit && <span className="text-sm pb-0.5" style={{ color: 'var(--text-muted)' }}>{unit}</span>}
        </div>
        {(subtitle || trend) && (
          <div className="flex items-center gap-2 mt-1">
            {subtitle && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
            {trend && (
              <span className={`text-xs font-medium ${trend.positive !== false ? 'text-success-500' : 'text-danger-500'}`}>
                {trend.value > 0 ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section Header ────────────────────────────────────────────────────────────
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 className="section-title">{title}</h2>
        {subtitle && <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ─── Alert Banner ─────────────────────────────────────────────────────────────
interface AlertBannerProps {
  level: 'warning' | 'critical' | 'info';
  message: string;
  onDismiss?: () => void;
}

export function AlertBanner({ level, message, onDismiss }: AlertBannerProps) {
  const styles = {
    warning:  { bg: 'bg-warning-500/15 border-warning-500/30', text: 'text-warning-600 dark:text-warning-400', dot: 'bg-warning-500' },
    critical: { bg: 'bg-danger-500/15 border-danger-500/30',   text: 'text-danger-600 dark:text-danger-400',   dot: 'bg-danger-500 animate-pulse' },
    info:     { bg: 'bg-accent-500/15 border-accent-500/30',   text: 'text-accent-600 dark:text-accent-400',   dot: 'bg-accent-500' },
  }[level];

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${styles.bg}`}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${styles.dot}`} />
      <p className={`flex-1 font-medium ${styles.text}`}>{message}</p>
      {onDismiss && (
        <button onClick={onDismiss} className={`${styles.text} hover:opacity-70 text-lg leading-none`}>×</button>
      )}
    </div>
  );
}

// ─── Loading Spinner ────────────────────────────────────────────────────────
export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className={`${sizes[size]} border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin`} />
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</p>
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null;

  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${widths[size]} card p-6 animate-fade-in`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          <button onClick={onClose} className="btn-ghost p-1 rounded-lg text-xl leading-none" id="modal-close">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Drawer ───────────────────────────────────────────────────────────────────
interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

export function Drawer({ open, onClose, title, children, width = 'max-w-xl' }: DrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative flex flex-col w-full ${width} h-full card rounded-l-2xl rounded-r-none animate-slide-right overflow-hidden`}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg" id="drawer-close">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description }: { icon?: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-4 opacity-30" style={{ color: 'var(--text-muted)' }}>{icon}</div>}
      <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{title}</p>
      {description && <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{description}</p>}
    </div>
  );
}
