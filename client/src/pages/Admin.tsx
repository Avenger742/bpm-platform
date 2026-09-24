import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/hooks/useApi';
import { SectionHeader, Modal, PageLoader, Badge } from '@/components/UI';
import { Users, Shield, Settings, DollarSign, Plus, Trash2, Edit2 } from 'lucide-react';

interface User { id: string; name: string; email: string; role: string; createdAt: string; }
interface Threshold { id: string; parameterName: string; warningMin: number | null; warningMax: number | null; criticalMin: number | null; criticalMax: number | null; unit: string; description?: string; }
interface Tariff { id: string; name: string; peakRate: number; offPeakRate: number; shoulderRate: number; demandChargeKw: number; effectiveFrom: string; }
interface AuditEntry { id: string; action: string; details: string; timestamp: string; user: { name: string; email: string; role: string }; }

type AdminTab = 'users' | 'thresholds' | 'tariffs' | 'audit';

export default function AdminPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [editThreshold, setEditThreshold] = useState<Threshold | null>(null);
  const [thresholdForm, setThresholdForm] = useState<Partial<Threshold>>({});

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [u, th, ta, al] = await Promise.all([
        apiFetch<User[]>('/api/users', token),
        apiFetch<Threshold[]>('/api/thresholds', token),
        apiFetch<Tariff[]>('/api/tariffs', token),
        apiFetch<{ data: AuditEntry[] }>('/api/audit?limit=50', token),
      ]);
      setUsers(u);
      setThresholds(th);
      setTariffs(ta);
      setAuditLogs(al.data);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token]);

  const updateThreshold = async () => {
    if (!editThreshold || !token) return;
    try {
      await apiFetch(`/api/thresholds/${editThreshold.id}`, token, { method: 'PUT', body: thresholdForm });
      setThresholds(prev => prev.map(t => t.id === editThreshold.id ? { ...t, ...thresholdForm } : t));
      setEditThreshold(null);
    } catch (e) { console.error(e); }
  };

  const deleteUser = async (id: string) => {
    if (!token || !confirm('Delete this user?')) return;
    try {
      await apiFetch(`/api/users/${id}`, token, { method: 'DELETE' });
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch { }
  };

  const TABS: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'users',      label: 'Users',      icon: <Users size={14} /> },
    { id: 'thresholds', label: 'Thresholds', icon: <Settings size={14} /> },
    { id: 'tariffs',    label: 'Tariffs',    icon: <DollarSign size={14} /> },
    { id: 'audit',      label: 'Audit Log',  icon: <Shield size={14} /> },
  ];

  const roleColor = (role: string) => ({
    ADMIN: 'bg-danger-500/15 text-danger-500',
    OPERATOR: 'bg-accent-400/15 text-accent-400',
    GENERAL_USER: 'bg-surface-400/15 text-surface-400',
  }[role] ?? '');

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          <Shield size={22} className="inline mr-2 text-danger-500" />
          Admin Panel
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>System administration · Restricted to Administrators only</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-tertiary)' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            id={`admin-tab-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-brand-500 text-white shadow-sm' : 'hover:bg-[var(--border-color)]'
            }`}
            style={{ color: tab === t.id ? undefined : 'var(--text-secondary)' }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Users Tab ───────────────────────────────────────────────────────── */}
      {tab === 'users' && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <SectionHeader title="User Management" subtitle={`${users.length} registered users`} />
            <button className="btn-primary gap-1" id="add-user-btn"><Plus size={14} /> Add User</button>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th><th>Email</th><th>Role</th><th>Created</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="font-medium">{u.name}</td>
                    <td className="font-mono text-xs">{u.email}</td>
                    <td><span className={`badge ${roleColor(u.role)}`}>{u.role}</span></td>
                    <td className="text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn-ghost p-1.5 rounded" title="Edit" id={`edit-user-${u.id}`}><Edit2 size={13} /></button>
                        <button className="btn-ghost p-1.5 rounded text-danger-500 hover:bg-danger-500/10" title="Delete" onClick={() => deleteUser(u.id)} id={`delete-user-${u.id}`}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Thresholds Tab ──────────────────────────────────────────────────── */}
      {tab === 'thresholds' && (
        <div className="card overflow-hidden">
          <div className="p-5 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <SectionHeader title="System Thresholds" subtitle="Warning and critical alarm limits for all monitored parameters" />
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Parameter</th><th>Unit</th><th>Warn Min</th><th>Warn Max</th><th>Crit Min</th><th>Crit Max</th><th>Action</th></tr>
              </thead>
              <tbody>
                {thresholds.map(th => (
                  <tr key={th.id}>
                    <td className="font-mono text-xs font-medium">{th.parameterName}</td>
                    <td><span className="badge bg-surface-500/10 text-surface-400">{th.unit}</span></td>
                    <td className="font-mono text-xs text-warning-500">{th.warningMin ?? '—'}</td>
                    <td className="font-mono text-xs text-warning-500">{th.warningMax ?? '—'}</td>
                    <td className="font-mono text-xs text-danger-500">{th.criticalMin ?? '—'}</td>
                    <td className="font-mono text-xs text-danger-500">{th.criticalMax ?? '—'}</td>
                    <td>
                      <button
                        className="btn-ghost p-1.5 rounded"
                        id={`edit-threshold-${th.id}`}
                        onClick={() => { setEditThreshold(th); setThresholdForm({ warningMin: th.warningMin, warningMax: th.warningMax, criticalMin: th.criticalMin, criticalMax: th.criticalMax }); }}
                      ><Edit2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tariffs Tab ─────────────────────────────────────────────────────── */}
      {tab === 'tariffs' && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <SectionHeader title="Utility Tariff Definitions" subtitle="Time-of-use rate configurations" />
            <button className="btn-primary gap-1" id="add-tariff-btn"><Plus size={14} /> Add Tariff</button>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Peak Rate</th><th>Off-Peak</th><th>Shoulder</th><th>Demand Charge</th><th>Effective From</th></tr>
              </thead>
              <tbody>
                {tariffs.map(t => (
                  <tr key={t.id}>
                    <td className="font-medium">{t.name}</td>
                    <td className="font-mono text-xs text-danger-400">${t.peakRate.toFixed(3)}/kWh</td>
                    <td className="font-mono text-xs text-success-400">${t.offPeakRate.toFixed(3)}/kWh</td>
                    <td className="font-mono text-xs text-warning-400">${t.shoulderRate.toFixed(3)}/kWh</td>
                    <td className="font-mono text-xs">${t.demandChargeKw.toFixed(2)}/kW/mo</td>
                    <td className="text-xs">{new Date(t.effectiveFrom).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Audit Log Tab ───────────────────────────────────────────────────── */}
      {tab === 'audit' && (
        <div className="card overflow-hidden">
          <div className="p-5 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <SectionHeader title="Audit Log" subtitle="All administrative and user actions" />
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Timestamp</th><th>User</th><th>Role</th><th>Action</th><th>Details</th></tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id}>
                    <td className="font-mono text-xs whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="text-xs">{log.user?.name}</td>
                    <td><span className={`badge ${roleColor(log.user?.role)}`}>{log.user?.role}</span></td>
                    <td className="font-mono text-xs text-accent-400">{log.action}</td>
                    <td className="text-xs max-w-xs truncate">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Threshold Edit Modal */}
      <Modal open={!!editThreshold} onClose={() => setEditThreshold(null)} title={`Edit Threshold: ${editThreshold?.parameterName}`}>
        {editThreshold && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'warningMin', label: 'Warning Min', color: 'text-warning-500' },
                { key: 'warningMax', label: 'Warning Max', color: 'text-warning-500' },
                { key: 'criticalMin', label: 'Critical Min', color: 'text-danger-500' },
                { key: 'criticalMax', label: 'Critical Max', color: 'text-danger-500' },
              ].map(f => (
                <div key={f.key}>
                  <label className={`label ${f.color}`}>{f.label} ({editThreshold.unit})</label>
                  <input
                    type="number"
                    className="input"
                    value={(thresholdForm as Record<string, unknown>)[f.key] as number ?? ''}
                    onChange={e => setThresholdForm(prev => ({ ...prev, [f.key]: e.target.value ? parseFloat(e.target.value) : null }))}
                    id={`threshold-${f.key}`}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary flex-1" onClick={() => setEditThreshold(null)}>Cancel</button>
              <button className="btn-primary flex-1" onClick={updateThreshold} id="save-threshold">Save Changes</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
