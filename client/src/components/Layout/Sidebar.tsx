import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Activity, BarChart3, Battery, AlertTriangle,
  Leaf, Shield, BookOpen, Zap, LogOut, ChevronLeft, ChevronRight,
  Settings
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles?: ('ADMIN' | 'OPERATOR' | 'GENERAL_USER')[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home',            path: '/home',          icon: <LayoutDashboard size={18} /> },
  { label: 'Live Dashboard',  path: '/dashboard',     icon: <Activity size={18} /> },
  { label: 'Energy Analytics',path: '/analytics',     icon: <BarChart3 size={18} /> },
  { label: 'Storage',         path: '/storage',       icon: <Battery size={18} /> },
  { label: 'Alerts & Maintenance', path: '/alerts',   icon: <AlertTriangle size={18} /> },
  { label: 'Environmental / ESG',  path: '/environmental', icon: <Leaf size={18} /> },
  { label: 'Admin Panel',     path: '/admin',         icon: <Shield size={18} />, roles: ['ADMIN'] },
  { label: 'About / Resources',    path: '/about',    icon: <BookOpen size={18} /> },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const visibleItems = NAV_ITEMS.filter(item =>
    !item.roles || (user && item.roles.includes(user.role))
  );

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleColor = {
    ADMIN: 'text-danger-400',
    OPERATOR: 'text-accent-400',
    GENERAL_USER: 'text-surface-400',
  }[user?.role ?? 'GENERAL_USER'];

  const roleBadge = {
    ADMIN: 'Admin',
    OPERATOR: 'Operator',
    GENERAL_USER: 'Viewer',
  }[user?.role ?? 'GENERAL_USER'];

  return (
    <aside
      className={`
        flex flex-col h-screen
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-16' : 'w-64'}
        flex-shrink-0
      `}
      style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 px-4 border-b border-white/5 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shadow-glow-green">
          <Zap size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-white font-bold text-sm leading-tight">BPM Platform</p>
            <p className="text-brand-500 text-[10px] font-medium uppercase tracking-widest">Microgrid Control</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center' : ''}`
            }
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-white/5 p-3 space-y-1">
        {!collapsed && user && (
          <div className="px-3 py-2 mb-2">
            <p className="text-white text-sm font-medium truncate">{user.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs font-semibold ${roleColor}`}>{roleBadge}</span>
              <span className="text-surface-600 text-xs truncate">{user.email}</span>
            </div>
          </div>
        )}

        <button
          onClick={onToggle}
          className="nav-item w-full justify-center"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span className="text-xs">Collapse</span></>}
        </button>

        {user?.role === 'ADMIN' && (
          <NavLink
            to="/admin"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? 'Settings' : undefined}
          >
            <Settings size={16} />
            {!collapsed && <span className="text-xs">Settings</span>}
          </NavLink>
        )}

        <button
          onClick={handleLogout}
          className="nav-item w-full text-danger-400 hover:text-danger-300 hover:bg-danger-500/10"
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut size={16} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
