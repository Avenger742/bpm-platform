import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/hooks/useApi';
import { Drawer, Badge, EmptyState, PageLoader } from '@/components/UI';
import { AlertTriangle, Plus, X } from 'lucide-react';

interface User { id: string; name: string; email: string; role: string; }

interface Ticket {
  id: string;
  ticketCode: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'NEW' | 'IN_PROGRESS' | 'RESOLVED';
  subsystem: string;
  resolutionNotes?: string;
  telemetrySnapshotJson?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: User;
  assignedTo?: User;
}

const COLUMNS: { id: Ticket['status']; label: string; color: string }[] = [
  { id: 'NEW',         label: 'New',         color: 'text-warning-500 bg-warning-500/10' },
  { id: 'IN_PROGRESS', label: 'In Progress',  color: 'text-accent-400 bg-accent-400/10' },
  { id: 'RESOLVED',    label: 'Resolved',     color: 'text-success-500 bg-success-500/10' },
];

const SEVERITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export default function AlertsPage() {
  const { token, isOperator } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = () => {
    if (!token) return;
    apiFetch<Ticket[]>('/api/tickets', token)
      .then(data => setTickets(data.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9))))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [token]);

  const moveTicket = async (id: string, newStatus: Ticket['status']) => {
    if (!token) return;
    setUpdatingId(id);
    try {
      await apiFetch(`/api/tickets/${id}`, token, { method: 'PATCH', body: { status: newStatus } });
      setTickets(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (e) {
      console.error('Failed to update ticket:', e);
    } finally {
      setUpdatingId(null);
    }
  };

  const ticketsByStatus = (status: Ticket['status']) =>
    tickets.filter(t => t.status === status);

  const getSeverityBadge = (s: string) => {
    const map: Record<string, string> = {
      LOW: 'severity-low', MEDIUM: 'severity-medium', HIGH: 'severity-high', CRITICAL: 'severity-critical',
    };
    return map[s] ?? 'severity-medium';
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Alerts & Maintenance</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Kanban ticketing board · {tickets.length} total tickets · {ticketsByStatus('NEW').length} open
          </p>
        </div>
        {isOperator && (
          <button className="btn-primary gap-1.5" id="new-ticket-btn">
            <Plus size={14} /> New Ticket
          </button>
        )}
      </div>

      {/* Kanban Board */}
      <div className="grid lg:grid-cols-3 gap-4 min-h-[500px]">
        {COLUMNS.map(col => (
          <div key={col.id} className="card p-4 flex flex-col min-h-[400px]">
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.color}`}>{col.label}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({ticketsByStatus(col.id).length})</span>
              </div>
            </div>

            {/* Cards */}
            <div className="flex-1 space-y-3 overflow-y-auto">
              {ticketsByStatus(col.id).length === 0 && (
                <EmptyState icon={<AlertTriangle size={28} />} title="No tickets" description={`No ${col.label.toLowerCase()} items`} />
              )}
              {ticketsByStatus(col.id).map(ticket => (
                <div
                  key={ticket.id}
                  className="card-hover p-3 space-y-2 border-l-2 cursor-pointer"
                  style={{
                    borderLeftColor:
                      ticket.severity === 'CRITICAL' ? '#ef4444' :
                      ticket.severity === 'HIGH' ? '#f97316' :
                      ticket.severity === 'MEDIUM' ? '#f59e0b' : '#22c55e',
                  }}
                  onClick={() => setSelected(ticket)}
                  id={`ticket-${ticket.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{ticket.ticketCode}</p>
                    <span className={getSeverityBadge(ticket.severity)}>{ticket.severity}</span>
                  </div>
                  <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>{ticket.title}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                      {ticket.subsystem}
                    </span>
                    {ticket.assignedTo && (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>→ {ticket.assignedTo.name}</span>
                    )}
                  </div>

                  {/* Status transition buttons (operator+) */}
                  {isOperator && (
                    <div className="flex gap-1 pt-1 border-t" style={{ borderColor: 'var(--border-color)' }} onClick={e => e.stopPropagation()}>
                      {col.id !== 'IN_PROGRESS' && col.id !== 'RESOLVED' && (
                        <button
                          className="text-[10px] px-2 py-0.5 rounded text-accent-400 bg-accent-400/10 hover:bg-accent-400/20 transition-colors"
                          onClick={() => moveTicket(ticket.id, 'IN_PROGRESS')}
                          disabled={updatingId === ticket.id}
                        >
                          → In Progress
                        </button>
                      )}
                      {col.id !== 'RESOLVED' && (
                        <button
                          className="text-[10px] px-2 py-0.5 rounded text-success-500 bg-success-500/10 hover:bg-success-500/20 transition-colors"
                          onClick={() => moveTicket(ticket.id, 'RESOLVED')}
                          disabled={updatingId === ticket.id}
                        >
                          ✓ Resolve
                        </button>
                      )}
                      {col.id === 'RESOLVED' && (
                        <button
                          className="text-[10px] px-2 py-0.5 rounded text-warning-500 bg-warning-500/10 hover:bg-warning-500/20 transition-colors"
                          onClick={() => moveTicket(ticket.id, 'NEW')}
                          disabled={updatingId === ticket.id}
                        >
                          ↩ Reopen
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Ticket Detail Drawer */}
      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.ticketCode ?? ''}
        width="max-w-2xl"
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className={
                selected.severity === 'CRITICAL' ? 'text-danger-500' :
                selected.severity === 'HIGH' ? 'text-orange-500' : 'text-warning-500'
              } />
              <div>
                <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>{selected.title}</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {selected.subsystem} · Created {new Date(selected.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={getSeverityBadge(selected.severity)}>{selected.severity}</span>
              <span className={`badge ${
                selected.status === 'NEW' ? 'bg-warning-500/15 text-warning-500' :
                selected.status === 'IN_PROGRESS' ? 'bg-accent-400/15 text-accent-400' : 'bg-success-500/15 text-success-500'
              }`}>{selected.status.replace('_', ' ')}</span>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Description</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{selected.description}</p>
            </div>

            {selected.resolutionNotes && (
              <div className="space-y-1 p-3 rounded-lg" style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                <p className="text-xs font-semibold text-success-500">Resolution Notes</p>
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{selected.resolutionNotes}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Created By</p>
                <p style={{ color: 'var(--text-primary)' }}>{selected.createdBy?.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{selected.createdBy?.role}</p>
              </div>
              {selected.assignedTo && (
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Assigned To</p>
                  <p style={{ color: 'var(--text-primary)' }}>{selected.assignedTo.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{selected.assignedTo.role}</p>
                </div>
              )}
            </div>

            {/* Telemetry Snapshot */}
            {selected.telemetrySnapshotJson && (() => {
              try {
                const snap = JSON.parse(selected.telemetrySnapshotJson);
                return (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      Telemetry Snapshot at Fault Time
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Captured: {new Date(snap.timestamp).toLocaleString()}
                    </p>
                    <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border-color)' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Parameter</th>
                            <th>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(snap).filter(([k]) => k !== 'timestamp').map(([k, v]) => (
                            <tr key={k}>
                              <td className="font-mono text-xs">{k}</td>
                              <td className="font-mono text-xs">{String(v)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              } catch { return null; }
            })()}

            {/* Quick status actions */}
            {isOperator && (
              <div className="flex gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                {selected.status !== 'IN_PROGRESS' && (
                  <button className="btn-secondary flex-1" onClick={() => { moveTicket(selected.id, 'IN_PROGRESS'); setSelected(null); }}>
                    Mark In Progress
                  </button>
                )}
                {selected.status !== 'RESOLVED' && (
                  <button className="btn-primary flex-1" onClick={() => { moveTicket(selected.id, 'RESOLVED'); setSelected(null); }}>
                    Resolve Ticket
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
