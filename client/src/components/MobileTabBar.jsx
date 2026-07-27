import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarCheck, Briefcase, Menu } from 'lucide-react';

// The four highest-traffic areas on a phone, plus More for everything else.
const TABS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/candidates', icon: Users, label: 'Candidates' },
  { to: '/interviews', icon: CalendarCheck, label: 'Interviews' },
  { to: '/vacancies', icon: Briefcase, label: 'Vacancies' },
];

export default function MobileTabBar({ onMore }) {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 lg:hidden bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-5">
        {TABS.map(tab => (
          <NavLink key={tab.to} to={tab.to}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}>
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute top-0 w-8 h-0.5 rounded-full bg-blue-600" />}
                <tab.icon size={21} strokeWidth={isActive ? 2.4 : 2} />
                <span className="leading-none">{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button onClick={onMore} type="button"
          className="flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-gray-500 hover:text-gray-700 transition-colors">
          <Menu size={21} />
          <span className="leading-none">More</span>
        </button>
      </div>
    </nav>
  );
}
