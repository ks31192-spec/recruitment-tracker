import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarCheck, Briefcase, Menu } from 'lucide-react';

// The four highest-traffic areas on a phone, plus More for everything else.
// Each tab keeps its own colour at all times — active state is signalled by the
// top bar, the deeper icon tint and the coloured label, not by draining the
// colour out of the inactive ones. Classes are written out in full so Tailwind
// doesn't purge them.
const TABS = [
  {
    to: '/dashboard', icon: LayoutDashboard, label: 'Home',
    text: 'text-blue-600', chip: 'bg-blue-50', chipActive: 'bg-blue-100', bar: 'bg-blue-600',
  },
  {
    to: '/candidates', icon: Users, label: 'Candidates',
    text: 'text-emerald-600', chip: 'bg-emerald-50', chipActive: 'bg-emerald-100', bar: 'bg-emerald-600',
  },
  {
    to: '/interviews', icon: CalendarCheck, label: 'Interviews',
    text: 'text-indigo-600', chip: 'bg-indigo-50', chipActive: 'bg-indigo-100', bar: 'bg-indigo-600',
  },
  {
    to: '/vacancies', icon: Briefcase, label: 'Vacancies',
    text: 'text-violet-600', chip: 'bg-violet-50', chipActive: 'bg-violet-100', bar: 'bg-violet-600',
  },
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
            className="relative flex flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 text-[11px] font-medium">
            {({ isActive }) => (
              <>
                {isActive && <span className={`absolute top-0 w-8 h-0.5 rounded-full ${tab.bar}`} />}
                <span className={`flex items-center justify-center w-9 h-7 rounded-lg transition-colors ${isActive ? tab.chipActive : tab.chip}`}>
                  <tab.icon size={19} className={tab.text} strokeWidth={isActive ? 2.5 : 2} />
                </span>
                <span className={`leading-none ${isActive ? `${tab.text} font-semibold` : 'text-gray-500'}`}>
                  {tab.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
        <button onClick={onMore} type="button"
          className="flex flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 text-[11px] font-medium">
          <span className="flex items-center justify-center w-9 h-7 rounded-lg bg-amber-50">
            <Menu size={19} className="text-amber-600" />
          </span>
          <span className="leading-none text-gray-500">More</span>
        </button>
      </div>
    </nav>
  );
}
