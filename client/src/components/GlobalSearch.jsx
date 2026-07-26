import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { navItems } from './Layout.jsx';
import api from '../lib/api.js';
import { Search, Briefcase, Users, ArrowRight, Plus, FileText, BarChart3, CalendarCheck, Settings, Shield, Copy, Bell, UserPlus, Columns3, Calendar, LayoutDashboard, Globe } from 'lucide-react';

const iconMap = { LayoutDashboard, Briefcase, Users, CalendarCheck, Calendar, Bell, BarChart3, Columns3, FileText, Shield, Settings, Copy, UserPlus, Globe };

const extraFeatures = [
  { label: 'Create Vacancy', desc: 'Add a new job vacancy', path: '/vacancies/new', keywords: 'new job post position opening add create vacancy', icon: Plus, category: 'Actions' },
  { label: 'Add Candidate', desc: 'Register a new candidate', path: '/candidates/new', keywords: 'new applicant add create register candidate', icon: Plus, category: 'Actions' },
  { label: 'Duplicate Candidates', desc: 'Find and merge duplicate candidate records', path: '/duplicates', keywords: 'duplicate merge same repeated candidate detection', icon: Copy, category: 'Pages' },
  { label: 'Interview Calendar', desc: 'View interview schedule on calendar', path: '/interviews/calendar', keywords: 'calendar schedule date interview view', icon: Calendar, category: 'Pages' },
  { label: 'Kanban Board', desc: 'Visual pipeline board for applications', path: '/kanban', keywords: 'kanban board pipeline drag stages visual', icon: Columns3, category: 'Pages' },
  { label: 'Follow-ups', desc: 'Pending follow-up actions', path: '/follow-ups', keywords: 'follow up pending reminder action todo', icon: Bell, category: 'Pages' },
  { label: 'Referrals', desc: 'Manage candidate referrals', path: '/referrals', keywords: 'referral refer recommend', icon: UserPlus, category: 'Pages' },
  { label: 'Analytics', desc: 'Recruitment analytics and charts', path: '/analytics', keywords: 'analytics stats chart graph data metrics numbers', icon: BarChart3, category: 'Pages' },
  { label: 'Reports', desc: 'Generate and export reports', path: '/reports', keywords: 'report export csv download pdf generate', icon: FileText, category: 'Pages' },
  { label: 'Audit Log', desc: 'View system activity log', path: '/audit-log', keywords: 'audit log activity history trail record', icon: Shield, category: 'Pages', roles: ['super_admin', 'admin'] },
  { label: 'Settings', desc: 'Manage departments, designations, users', path: '/settings', keywords: 'settings config departments designations users academic year manage', icon: Settings, category: 'Pages', roles: ['super_admin', 'admin'] },
  { label: 'Careers Page', desc: 'Public-facing careers page', path: '/careers', keywords: 'careers public job listing portal external', icon: Globe, category: 'Pages', external: true },
  { label: 'Candidate Portal', desc: 'Candidate self-service portal', path: '/portal', keywords: 'portal candidate status check application self service', icon: Users, category: 'Pages', external: true },
];

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ features: [], candidates: [], vacancies: [] });
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const allFeatures = useMemo(() => {
    const fromNav = navItems.map(n => ({
      label: n.label,
      desc: `Go to ${n.label}`,
      path: n.to,
      keywords: n.label.toLowerCase(),
      icon: n.icon,
      category: 'Pages',
      roles: n.roles,
    }));
    const merged = [...fromNav];
    for (const ef of extraFeatures) {
      if (!merged.some(m => m.path === ef.path)) merged.push(ef);
    }
    return merged.filter(f => !f.roles || f.roles.includes(user?.role));
  }, [user?.role]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setOpen(true); }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); }
    else { setQuery(''); setResults({ features: [], candidates: [], vacancies: [] }); setSelected(0); }
  }, [open]);

  useEffect(() => {
    if (!query) {
      setResults({ features: allFeatures.slice(0, 8), candidates: [], vacancies: [] });
      setSelected(0);
      return;
    }

    const q = query.toLowerCase();
    const matchedFeatures = allFeatures.filter(f =>
      f.label.toLowerCase().includes(q) || f.keywords.includes(q) || (f.desc && f.desc.toLowerCase().includes(q))
    );

    if (q.length < 2) {
      setResults({ features: matchedFeatures.slice(0, 8), candidates: [], vacancies: [] });
      setSelected(0);
      return;
    }

    const t = setTimeout(async () => {
      try {
        const [cands, vacs] = await Promise.all([
          api.get('/candidates', { params: { search: query, page: 1 } }),
          api.get('/vacancies', { params: { status: 'all' } }),
        ]);
        setResults({
          features: matchedFeatures.slice(0, 5),
          candidates: cands.data.data.candidates?.slice(0, 5) || [],
          vacancies: (vacs.data.data || []).filter(v =>
            v.title.toLowerCase().includes(q) || (v.subject || '').toLowerCase().includes(q)
          ).slice(0, 5),
        });
        setSelected(0);
      } catch {
        setResults({ features: matchedFeatures.slice(0, 8), candidates: [], vacancies: [] });
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, allFeatures]);

  const flatItems = useMemo(() => {
    const items = [];
    results.features.forEach(f => items.push({ type: 'feature', data: f }));
    results.candidates.forEach(c => items.push({ type: 'candidate', data: c }));
    results.vacancies.forEach(v => items.push({ type: 'vacancy', data: v }));
    return items;
  }, [results]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selected}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const go = (path, external) => {
    if (external) { window.open(path, '_blank'); } else { navigate(path); }
    setOpen(false);
  };

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(i => Math.min(i + 1, flatItems.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && flatItems[selected]) {
      e.preventDefault();
      const item = flatItems[selected];
      if (item.type === 'feature') go(item.data.path, item.data.external);
      else if (item.type === 'candidate') go(`/candidates/${item.data.id}`);
      else if (item.type === 'vacancy') go(`/vacancies/${item.data.id}`);
    }
  };

  if (!open) return null;

  const hasResults = flatItems.length > 0;
  let idx = 0;

  return (
    <div className="fixed inset-0 z-[90] bg-black/40 flex items-start justify-center pt-[15vh]" onClick={() => setOpen(false)}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <Search size={18} className="text-gray-400" />
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKey}
            placeholder="Search pages, features, candidates, vacancies..."
            className="flex-1 outline-none text-sm" />
          <kbd className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Esc</kbd>
        </div>
        <div ref={listRef} className="max-h-80 overflow-y-auto">
          {!hasResults && query.length >= 2 && (
            <p className="text-sm text-gray-500 text-center py-8">No results found</p>
          )}

          {results.features.length > 0 && (
            <div className="p-2">
              <p className="text-xs font-semibold text-gray-400 uppercase px-2 py-1">{query ? 'Features' : 'Quick Navigation'}</p>
              {results.features.map(f => {
                const i = idx++;
                const Icon = f.icon || ArrowRight;
                return (
                  <button key={f.path} data-idx={i} onClick={() => go(f.path, f.external)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg text-sm transition-colors ${i === selected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}>
                    <Icon size={16} className={i === selected ? 'text-blue-500' : 'text-gray-400'} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{f.label}</p>
                      <p className="text-xs text-gray-500 truncate">{f.desc}</p>
                    </div>
                    <ArrowRight size={14} className="text-gray-300 shrink-0" />
                  </button>
                );
              })}
            </div>
          )}

          {results.candidates.length > 0 && (
            <div className="p-2 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase px-2 py-1">Candidates</p>
              {results.candidates.map(c => {
                const i = idx++;
                return (
                  <button key={c.id} data-idx={i} onClick={() => go(`/candidates/${c.id}`)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg text-sm transition-colors ${i === selected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}>
                    <Users size={16} className={i === selected ? 'text-blue-500' : 'text-gray-400'} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{c.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">{c.phone || c.email || ''}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {results.vacancies.length > 0 && (
            <div className="p-2 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase px-2 py-1">Vacancies</p>
              {results.vacancies.map(v => {
                const i = idx++;
                return (
                  <button key={v.id} data-idx={i} onClick={() => go(`/vacancies/${v.id}`)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg text-sm transition-colors ${i === selected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}>
                    <Briefcase size={16} className={i === selected ? 'text-blue-500' : 'text-gray-400'} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{v.title}</p>
                      <p className="text-xs text-gray-500 truncate">{v.department_name} {v.subject ? `- ${v.subject}` : ''}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
