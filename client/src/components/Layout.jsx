import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { LayoutDashboard, Briefcase, Users, CalendarCheck, Bell, Settings, LogOut, Menu, Search } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/vacancies', icon: Briefcase, label: 'Vacancies' },
  { to: '/candidates', icon: Users, label: 'Candidates' },
  { to: '/interviews', icon: CalendarCheck, label: 'Interviews' },
  { to: '/follow-ups', icon: Bell, label: 'Follow-ups' },
  { to: '/settings', icon: Settings, label: 'Settings', roles: ['super_admin', 'admin'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const openSearch = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 border-b border-gray-200">
          <h1 className="text-lg font-bold text-blue-700">A M World School</h1>
          <p className="text-xs text-gray-500 mt-0.5">Recruitment Tracker</p>
        </div>

        <button onClick={openSearch} className="mx-3 mt-3 flex items-center gap-2 px-3 py-2 text-sm text-gray-500 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
          <Search size={15} />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="text-xs bg-white px-1.5 py-0.5 rounded border border-gray-200">Ctrl+K</kbd>
        </button>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.filter(n => !n.roles || n.roles.includes(user?.role)).map(item => (
            <NavLink key={item.to} to={item.to} onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-200">
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-gray-800 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role?.replace(/_/g, ' ')}</p>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-gray-100">
            <Menu size={20} />
          </button>
          <span className="ml-3 font-semibold text-blue-700">Recruitment Tracker</span>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
