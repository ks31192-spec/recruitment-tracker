import { useState, useEffect } from 'react';
import api from '../lib/api.js';
import { BarChart3, TrendingUp, Users, Clock, Target, Award } from 'lucide-react';

function Card({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} className="text-blue-600" />
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function BarRow({ label, value, max, color = 'bg-blue-500' }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-sm text-gray-600 w-32 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-5 relative">
        <div className={`${color} rounded-full h-5 transition-all`} style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
      <span className="text-sm font-semibold text-gray-900 w-10 text-right">{value}</span>
    </div>
  );
}

export default function Analytics() {
  const [timeToHire, setTimeToHire] = useState([]);
  const [funnel, setFunnel] = useState([]);
  const [sources, setSources] = useState([]);
  const [aging, setAging] = useState([]);
  const [workload, setWorkload] = useState([]);
  const [offers, setOffers] = useState(null);
  const [tab, setTab] = useState('funnel');

  useEffect(() => {
    api.get('/analytics/time-to-hire').then(r => setTimeToHire(r.data.data));
    api.get('/analytics/stage-funnel').then(r => setFunnel(r.data.data.funnel));
    api.get('/analytics/source-effectiveness').then(r => setSources(r.data.data));
    api.get('/analytics/vacancy-aging').then(r => setAging(r.data.data));
    api.get('/analytics/recruiter-workload').then(r => setWorkload(r.data.data));
    api.get('/analytics/offer-acceptance').then(r => setOffers(r.data.data));
  }, []);

  const tabs = [
    { key: 'funnel', label: 'Pipeline Funnel', icon: TrendingUp },
    { key: 'sources', label: 'Source Effectiveness', icon: Target },
    { key: 'time', label: 'Time to Hire', icon: Clock },
    { key: 'aging', label: 'Vacancy Aging', icon: BarChart3 },
    { key: 'workload', label: 'Recruiter Workload', icon: Users },
    { key: 'offers', label: 'Offer Acceptance', icon: Award },
  ];

  const stageLabels = { applied: 'Applied', shortlisted: 'Shortlisted', interview_scheduled: 'Interview', interview_done: 'Interviewed', demo_scheduled: 'Demo', demo_done: 'Demo Done', selected: 'Selected', offer_made: 'Offered', joined: 'Joined' };
  const maxFunnel = Math.max(...funnel.map(f => f.count), 1);
  const maxSource = Math.max(...sources.map(s => s.total_candidates), 1);
  const sourceLabels = { walk_in: 'Walk-in', naukri: 'Naukri', whatsapp: 'WhatsApp', referral: 'Referral', website: 'Website', direct_call: 'Direct Call', other: 'Other' };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <BarChart3 className="text-blue-600" size={24} />
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'funnel' && (
        <Card title="Stage Conversion Funnel" icon={TrendingUp}>
          {funnel.length === 0 ? <p className="text-sm text-gray-500">No application data yet.</p> : (
            <div className="space-y-1">
              {funnel.map((s, i) => (
                <div key={s.stage}>
                  <BarRow label={stageLabels[s.stage] || s.stage} value={s.count} max={maxFunnel}
                    color={i < 3 ? 'bg-blue-500' : i < 6 ? 'bg-indigo-500' : i < 8 ? 'bg-green-500' : 'bg-emerald-500'} />
                  {i < funnel.length - 1 && funnel[i].count > 0 && (
                    <div className="text-xs text-gray-400 text-right pr-12">
                      ↓ {funnel[i + 1].count > 0 ? Math.round((funnel[i + 1].count / funnel[i].count) * 100) : 0}% conversion
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'sources' && (
        <Card title="Source Effectiveness" icon={Target}>
          {sources.length === 0 ? <p className="text-sm text-gray-500">No data yet.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 uppercase border-b">
                  <tr><th className="text-left py-2 pr-4">Source</th><th className="text-right py-2 px-2">Candidates</th><th className="text-right py-2 px-2">Applications</th><th className="text-right py-2 px-2">Shortlisted</th><th className="text-right py-2 px-2">Hired</th><th className="text-right py-2 pl-2">Hire Rate</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sources.map(s => (
                    <tr key={s.source || 'unknown'}>
                      <td className="py-2 pr-4 font-medium text-gray-900">{sourceLabels[s.source] || s.source || 'Unknown'}</td>
                      <td className="py-2 px-2 text-right">{s.total_candidates}</td>
                      <td className="py-2 px-2 text-right">{s.total_applications}</td>
                      <td className="py-2 px-2 text-right">{s.shortlisted}</td>
                      <td className="py-2 px-2 text-right font-semibold text-green-700">{s.hired}</td>
                      <td className="py-2 pl-2 text-right">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.hire_rate > 20 ? 'bg-green-100 text-green-700' : s.hire_rate > 5 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                          {s.hire_rate || 0}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'time' && (
        <Card title="Average Time to Hire (Days)" icon={Clock}>
          {timeToHire.length === 0 ? <p className="text-sm text-gray-500">No hires yet to calculate.</p> : (
            <div className="space-y-1">
              {timeToHire.map(t => (
                <BarRow key={t.vacancy_id} label={t.title} value={t.avg_days} max={Math.max(...timeToHire.map(x => x.avg_days), 1)}
                  color={t.avg_days <= 30 ? 'bg-green-500' : t.avg_days <= 60 ? 'bg-yellow-500' : 'bg-red-500'} />
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'aging' && (
        <Card title="Open Vacancy Aging" icon={BarChart3}>
          {aging.length === 0 ? <p className="text-sm text-gray-500">No open vacancies.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 uppercase border-b">
                  <tr><th className="text-left py-2 pr-4">Vacancy</th><th className="text-left py-2 px-2">Department</th><th className="text-right py-2 px-2">Days Open</th><th className="text-right py-2 px-2">Applicants</th><th className="text-right py-2 pl-2">Filled</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {aging.map(a => (
                    <tr key={a.id}>
                      <td className="py-2 pr-4 font-medium text-gray-900">{a.title}</td>
                      <td className="py-2 px-2 text-gray-600">{a.department_name || '-'}</td>
                      <td className="py-2 px-2 text-right">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.days_open > 60 ? 'bg-red-100 text-red-700' : a.days_open > 30 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                          {a.days_open}d
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right">{a.applicant_count}</td>
                      <td className="py-2 pl-2 text-right">{a.positions_filled}/{a.positions_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'workload' && (
        <Card title="Recruiter Workload" icon={Users}>
          {workload.length === 0 ? <p className="text-sm text-gray-500">No active recruiters.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 uppercase border-b">
                  <tr><th className="text-left py-2 pr-4">Recruiter</th><th className="text-right py-2 px-2">Active Vacancies</th><th className="text-right py-2 px-2">Pending Interviews</th><th className="text-right py-2 pl-2">Comms (7d)</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {workload.map(w => (
                    <tr key={w.id}>
                      <td className="py-2 pr-4 font-medium text-gray-900">{w.name}</td>
                      <td className="py-2 px-2 text-right">{w.active_vacancies}</td>
                      <td className="py-2 px-2 text-right">{w.pending_interviews}</td>
                      <td className="py-2 pl-2 text-right">{w.comms_this_week}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'offers' && (
        <Card title="Offer Acceptance" icon={Award}>
          {!offers ? <p className="text-sm text-gray-500">Loading...</p> : offers.total_offers === 0 ? <p className="text-sm text-gray-500">No offers made yet.</p> : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-700">{offers.total_offers}</p>
                <p className="text-xs text-gray-500 mt-1">Total Offers</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-700">{offers.accepted}</p>
                <p className="text-xs text-gray-500 mt-1">Accepted ({offers.acceptance_rate || 0}%)</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-700">{offers.declined}</p>
                <p className="text-xs text-gray-500 mt-1">Declined</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-700">{offers.pending}</p>
                <p className="text-xs text-gray-500 mt-1">Pending</p>
              </div>
              <div className="text-center p-4 bg-emerald-50 rounded-lg">
                <p className="text-2xl font-bold text-emerald-700">{offers.actually_joined}</p>
                <p className="text-xs text-gray-500 mt-1">Actually Joined</p>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <p className="text-2xl font-bold text-amber-700">{offers.negotiating}</p>
                <p className="text-xs text-gray-500 mt-1">Negotiating</p>
              </div>
              <div className="text-center p-4 bg-pink-50 rounded-lg">
                <p className="text-2xl font-bold text-pink-700">{offers.left_probation}</p>
                <p className="text-xs text-gray-500 mt-1">Left During Probation</p>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
