import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { LayoutDashboard, Briefcase, Users, CalendarCheck, Calendar, Bell, BarChart3, Columns3, FileText, Shield, Settings, LogOut, Menu, Search, Globe, UserPlus, Copy, UserCheck } from 'lucide-react';
import { useState } from 'react';
import { useBranding } from '../context/BrandingContext.jsx';
import NotificationBell from './NotificationBell.jsx';

export const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: 'text-blue-400', bg: 'bg-blue-500/15', active: 'bg-gradient-to-r from-blue-600 to-indigo-500' },
  { to: '/vacancies', icon: Briefcase, label: 'Vacancies', color: 'text-violet-400', bg: 'bg-violet-500/15', active: 'bg-gradient-to-r from-violet-600 to-purple-500' },
  { to: '/candidates', icon: Users, label: 'Candidates', color: 'text-emerald-400', bg: 'bg-emerald-500/15', active: 'bg-gradient-to-r from-emerald-600 to-teal-500' },
  { to: '/duplicates', icon: Copy, label: 'Duplicates', color: 'text-amber-400', bg: 'bg-amber-500/15', active: 'bg-gradient-to-r from-amber-500 to-orange-500' },
  { to: '/interviews', icon: CalendarCheck, label: 'Interviews', color: 'text-indigo-400', bg: 'bg-indigo-500/15', active: 'bg-gradient-to-r from-indigo-600 to-blue-500' },
  { to: '/interviews/calendar', icon: Calendar, label: 'Calendar', color: 'text-purple-400', bg: 'bg-purple-500/15', active: 'bg-gradient-to-r from-purple-600 to-indigo-500' },
  { to: '/follow-ups', icon: Bell, label: 'Follow-ups', color: 'text-orange-400', bg: 'bg-orange-500/15', active: 'bg-gradient-to-r from-orange-500 to-amber-500' },
  { to: '/referrals', icon: UserPlus, label: 'Referrals', color: 'text-pink-400', bg: 'bg-pink-500/15', active: 'bg-gradient-to-r from-pink-600 to-rose-500' },
  { to: '/onboarding', icon: UserCheck, label: 'Onboarding', color: 'text-cyan-400', bg: 'bg-cyan-500/15', active: 'bg-gradient-to-r from-cyan-600 to-blue-500' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics', color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/15', active: 'bg-gradient-to-r from-fuchsia-600 to-pink-500' },
  { to: '/kanban', icon: Columns3, label: 'Kanban Board', color: 'text-sky-400', bg: 'bg-sky-500/15', active: 'bg-gradient-to-r from-sky-600 to-blue-500' },
  { to: '/reports', icon: FileText, label: 'Reports', color: 'text-teal-400', bg: 'bg-teal-500/15', active: 'bg-gradient-to-r from-teal-600 to-emerald-500' },
  { to: '/audit-log', icon: Shield, label: 'Audit Log', roles: ['super_admin', 'admin'], color: 'text-slate-400', bg: 'bg-slate-500/15', active: 'bg-gradient-to-r from-slate-600 to-gray-500' },
  { to: '/settings', icon: Settings, label: 'Settings', roles: ['super_admin', 'admin'], color: 'text-gray-400', bg: 'bg-gray-500/15', active: 'bg-gradient-to-r from-gray-600 to-slate-500' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { schoolName } = useBranding();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const openSearch = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700 flex flex-col transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-4 py-3 border-b border-slate-700">
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent leading-tight">{schoolName}</h1>
          <p className="text-xs text-slate-400">Recruitment Tracker</p>
        </div>

        <button onClick={openSearch} className="mx-3 mt-2 flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 bg-slate-700/50 rounded-lg border border-slate-600 hover:bg-slate-700 transition-colors">
          <Search size={15} />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="text-xs bg-slate-600 px-1.5 py-0.5 rounded border border-slate-500 text-slate-300">Ctrl+K</kbd>
        </button>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.filter(n => !n.roles || n.roles.includes(user?.role)).map(item => (
            <NavLink key={item.to} to={item.to} onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive ? item.active + ' text-white shadow-lg' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'}`}>
              {({ isActive }) => (
                <>
                  <span className={`flex items-center justify-center w-7 h-7 rounded-md shrink-0 ${isActive ? 'bg-white/20' : item.bg}`}>
                    <item.icon size={16} className={isActive ? 'text-white' : item.color} />
                  </span>
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
          <a href="/careers" target="_blank" rel="noopener"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors">
            <span className="flex items-center justify-center w-7 h-7 rounded-md bg-green-500/15">
              <Globe size={16} className="text-green-400" />
            </span>
            Careers Page
          </a>
        </nav>
        <div className="px-3 py-2 border-t border-slate-700 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 capitalize">{user?.role?.replace(/_/g, ' ')}</p>
          </div>
          <div className="hidden lg:block">
            <NotificationBell />
          </div>
          <button onClick={handleLogout} className="p-1.5 text-red-600 hover:bg-red-500/20 rounded-lg transition-colors" title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-gray-100">
            <Menu size={20} />
          </button>
          <span className="ml-3 font-semibold text-blue-700 flex-1">Recruitment Tracker</span>
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
