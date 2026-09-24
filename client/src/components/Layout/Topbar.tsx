import { Sun, Moon, Contrast, Bell, Search, Menu } from 'lucide-react';
import { useTheme, Theme } from '@/theme/ThemeProvider';
import { useWebSocket } from '@/hooks/useWebSocket';

interface TopbarProps {
  onMenuToggle?: () => void;
  pageTitle?: string;
}

const THEME_OPTIONS: { value: Theme; icon: React.ReactNode; label: string }[] = [
  { value: 'light',         icon: <Sun size={14} />,      label: 'Light' },
  { value: 'dark',          icon: <Moon size={14} />,     label: 'Dark' },
  { value: 'high-contrast', icon: <Contrast size={14} />, label: 'High Contrast' },
];

export function Topbar({ onMenuToggle, pageTitle }: TopbarProps) {
  const { theme, setTheme } = useTheme();
  const { connected, alerts } = useWebSocket();

  const unreadAlerts = alerts.length;

  return (
    <header
      className="h-16 flex items-center justify-between px-4 lg:px-6 border-b flex-shrink-0"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-color)',
      }}
    >
      {/* Left — Mobile menu + Page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="btn-ghost p-2 md:hidden"
          aria-label="Toggle menu"
          id="menu-toggle-btn"
        >
          <Menu size={20} />
        </button>
        {pageTitle && (
          <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {pageTitle}
          </h1>
        )}
      </div>

      {/* Center — Search (desktop) */}
      <div className="hidden md:flex items-center gap-2 flex-1 max-w-xs mx-6">
        <div className="relative w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            id="global-search"
            type="text"
            placeholder="Search tickets, metrics..."
            className="input pl-8 text-xs h-8"
          />
        </div>
      </div>

      {/* Right — Status + Theme + Alerts */}
      <div className="flex items-center gap-2">
        {/* Live connection indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
          style={{
            background: connected ? 'rgba(0,217,122,0.12)' : 'rgba(239,68,68,0.12)',
            color: connected ? '#00d97a' : '#ef4444',
          }}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-brand-500 animate-pulse' : 'bg-danger-500'}`} />
          {connected ? 'Live' : 'Offline'}
        </div>

        {/* Theme selector */}
        <div className="flex items-center gap-0.5 p-1 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              id={`theme-${opt.value}`}
              onClick={() => setTheme(opt.value)}
              title={`${opt.label} Mode`}
              className={`p-1.5 rounded-md transition-all duration-150 ${
                theme === opt.value
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'hover:bg-[var(--border-color)]'
              }`}
              style={{ color: theme === opt.value ? undefined : 'var(--text-muted)' }}
            >
              {opt.icon}
            </button>
          ))}
        </div>

        {/* Alerts bell */}
        <button
          id="alerts-bell"
          className="relative btn-ghost p-2 rounded-lg"
          title={`${unreadAlerts} active alert(s)`}
        >
          <Bell size={18} style={{ color: 'var(--text-secondary)' }} />
          {unreadAlerts > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {Math.min(unreadAlerts, 9)}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
