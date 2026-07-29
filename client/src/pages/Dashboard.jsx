import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';
import { Briefcase, Users, CalendarCheck, Mail, AlertCircle, CheckCircle, Plus, Globe, BarChart3, TrendingUp } from 'lucide-react';

const statCards = [
  { key: 'active_vacancies', label: 'Active Vacancies', icon: Briefcase, color: 'blue', link: '/vacancies' },
  { key: 'total_candidates', label: 'Total Candidates', icon: Users, color: 'green', link: '/candidates' },
  { key: 'apps_this_month', label: 'This Month', icon: TrendingUp, color: 'purple' },
  { key: 'pending_interviews', label: 'Pending Interviews', icon: CalendarCheck, color: 'orange', link: '/interviews' },
  { key: 'pending_offers', label: 'Pending Offers', icon: Mail, color: 'pink' },
  { key: 'overdue_followups', label: 'Overdue Follow-ups', icon: AlertCircle, color: 'red', link: '/follow-ups' },
];

const colorMap = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', accent: 'bg-blue-600' },
  green: { bg: 'bg-green-50', text: 'text-green-600', accent: 'bg-green-600' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', accent: 'bg-purple-600' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600', accent: 'bg-orange-600' },
  pink: { bg: 'bg-pink-50', text: 'text-pink-600', accent: 'bg-pink-600' },
  red: { bg: 'bg-red-50', text: 'text-red-600', accent: 'bg-red-600' },
};

const pipelineColors = {
  applied: '#94a3b8', shortlisted: '#3b82f6', interview_scheduled: '#6366f1',
  interview_done: '#8b5cf6', demo_scheduled: '#06b6d4', demo_done: '#14b8a6',
  selected: '#22c55e', offer_made: '#10b981', joined: '#16a34a',
  rejected: '#ef4444', waitlisted: '#f59e0b', declined: '#f97316', no_response: '#9ca3af',
};

export default function Dashboard() {
  const [summary, setSummary] = useState({});
  const [activity, setActivity] = useState([]);
  const [pipeline, setPipeline] = useState([]);
  const [sources, setSources] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Each widget stands alone, so a failure in one must not blank the others —
    // and none of these had a catch, so any failure was an unhandled rejection.
    const get = (url, set, fallback) =>
      api.get(url).then(r => set(r.data.data ?? fallback)).catch(() => set(fallback));
    Promise.all([
      get('/dashboard/summary', setSummary, {}),
      get('/dashboard/recent-activity', setActivity, []),
      get('/dashboard/pipeline-summary', setPipeline, []),
      get('/dashboard/source-analysis', setSources, []),
    ]).finally(() => setLoading(false));
  }, []);

  const maxPipeline = Math.max(...pipeline.map(p => p.count), 1);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 mb-6 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-white/70 text-sm mt-1">Welcome back! Here's your recruitment overview</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <a href="/careers" target="_blank" rel="noopener" className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg transition-colors">
              <Globe size={16} /> Careers Page
            </a>
            <Link to="/candidates/new" className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg transition-colors">
              <Plus size={16} /> Add Candidate
            </Link>
            <Link to="/vacancies/new" className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg transition-colors">
              <Plus size={16} /> Create Vacancy
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map(card => {
          const c = colorMap[card.color];
          const val = summary[card.key];
          const inner = (
            <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.bg}`}>
                  <card.icon size={20} className={c.text} />
                </div>
                {val > 0 && card.color === 'red' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                )}
              </div>
              {loading
                ? <div className="h-8 w-12 bg-gray-200 rounded animate-pulse" />
                : <p className="text-2xl font-bold text-gray-900">{val ?? '-'}</p>}
              <p className="text-xs text-gray-500 mt-1">{card.label}</p>
            </div>
          );
          return card.link ? <Link key={card.key} to={card.link}>{inner}</Link> : <div key={card.key}>{inner}</div>;
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Pipeline Summary</h2>
            <Link to="/kanban" className="text-xs text-blue-600 hover:underline">View Kanban</Link>
          </div>
          {pipeline.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase className="mx-auto text-gray-300 mb-2" size={32} />
              <p className="text-sm text-gray-500">No active applications yet</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {pipeline.map(s => {
                const pct = (s.count / maxPipeline) * 100;
                const color = pipelineColors[s.current_stage] || '#94a3b8';
                return (
                  <div key={s.current_stage} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600 capitalize">{s.current_stage.replace(/_/g, ' ')}</span>
                      <span className="text-xs font-bold text-gray-900">{s.count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          </div>
          {activity.length === 0 ? (
            <div className="text-center py-8">
              <CalendarCheck className="mx-auto text-gray-300 mb-2" size={32} />
              <p className="text-sm text-gray-500">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {activity.map((a, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: pipelineColors[a.to_stage] || '#94a3b8' }} />
                  <div className="flex-1 min-w-0">
                    <p>
                      <Link to={`/candidates/${a.candidate_id}`} className="font-medium text-gray-800 hover:text-blue-600">{a.full_name}</Link>
                      <span className="text-gray-500"> moved to </span>
                      <span className="font-medium capitalize" style={{ color: pipelineColors[a.to_stage] || '#666' }}>{a.to_stage?.replace(/_/g, ' ')}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{a.vacancy_title} &middot; {a.changed_by_name} &middot; {new Date(a.changed_at).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Source Breakdown</h2>
            <Link to="/analytics" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              <BarChart3 size={14} /> Analytics
            </Link>
          </div>
          {sources.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto text-gray-300 mb-2" size={32} />
              <p className="text-sm text-gray-500">No data yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sources.filter(s => s.source).map(s => {
                const labels = { walk_in: 'Walk-in', naukri: 'Naukri', whatsapp: 'WhatsApp', referral: 'Referral', website: 'Website', direct_call: 'Direct Call', other: 'Other' };
                const colors = { walk_in: '#22c55e', naukri: '#3b82f6', whatsapp: '#10b981', referral: '#a855f7', website: '#06b6d4', direct_call: '#f97316', other: '#94a3b8' };
                const maxTotal = Math.max(...sources.map(x => x.total), 1);
                return (
                  <div key={s.source}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600">{labels[s.source] || s.source}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900">{s.total}</span>
                        {s.hired > 0 && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">{s.hired} hired</span>}
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(s.total / maxTotal) * 100}%`, backgroundColor: colors[s.source] || '#94a3b8' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { to: '/careers', icon: Globe, color: 'text-emerald-600', label: 'Careers Page', desc: 'Public job listings', external: true },
              { to: '/analytics', icon: BarChart3, color: 'text-blue-600', label: 'Analytics', desc: 'Funnel & reports' },
              { to: '/follow-ups', icon: AlertCircle, color: 'text-orange-600', label: 'Follow-ups', desc: `${summary.overdue_followups || 0} overdue` },
              { to: '/interviews', icon: CalendarCheck, color: 'text-purple-600', label: 'Interviews', desc: `${summary.pending_interviews || 0} pending` },
            ].map(item => {
              const Wrapper = item.external ? 'a' : Link;
              const extra = item.external ? { href: item.to, target: '_blank', rel: 'noopener' } : { to: item.to };
              return (
                <Wrapper key={item.to} {...extra} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-colors">
                  <item.icon className={item.color} size={20} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </Wrapper>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
