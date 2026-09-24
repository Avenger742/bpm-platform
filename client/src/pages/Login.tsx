import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const DEMO_ACCOUNTS = [
    { label: 'Admin', email: 'admin@bpmplatform.io', password: 'Admin@BPM2024' },
    { label: 'Operator', email: 'operator@bpmplatform.io', password: 'Operator@BPM2024' },
    { label: 'Viewer', email: 'user@bpmplatform.io', password: 'User@BPM2024' },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-primary)' }}>
      {/* Left panel — brand */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #003320 100%)' }}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shadow-glow-green">
              <Zap size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg">BPM Platform</p>
              <p className="text-brand-400 text-xs uppercase tracking-widest">Biomass & Power Management</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Industrial-Grade<br />
              <span className="text-brand-400">Microgrid Control</span>
            </h1>
            <p className="text-surface-300 mt-4 leading-relaxed">
              Monitor, manage, and optimize your hybrid solar-bioenergy microgrid in real-time.
              ESG compliance, predictive maintenance, and energy analytics in one platform.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Renewable Share', value: '78%' },
              { label: 'CO₂ Avoided', value: '342t' },
              { label: 'System Uptime', value: '99.7%' },
            ].map(stat => (
              <div key={stat.label} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <p className="text-brand-400 font-bold text-xl">{stat.value}</p>
                <p className="text-surface-400 text-xs mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Background grid pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6 animate-fade-in">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-lg bg-brand-500 flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>BPM Platform</p>
          </div>

          <div>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Welcome back</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Sign in to the control room</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="login-email">Email address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input pl-9"
                  placeholder="admin@bpmplatform.io"
                  required
                  autoComplete="email"
                />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="login-password">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input pl-9 pr-9"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                  id="toggle-password"
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-3 py-2 rounded-lg text-sm bg-danger-500/10 text-danger-400 border border-danger-500/20">
                {error}
              </div>
            )}

            <button
              type="submit"
              id="login-submit"
              className="btn-primary w-full h-10"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo accounts */}
          <div>
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Quick access — Demo accounts:</p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map(acc => (
                <button
                  key={acc.label}
                  id={`demo-${acc.label.toLowerCase()}`}
                  onClick={() => { setEmail(acc.email); setPassword(acc.password); }}
                  className="btn-secondary text-xs py-1.5"
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            BPM Platform v1.0 · Industrial Microgrid Management
          </p>
        </div>
      </div>
    </div>
  );
}
