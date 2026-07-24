import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';
import { Briefcase, Users, CalendarCheck, Mail, AlertCircle, CheckCircle, Plus, ArrowRight } from 'lucide-react';

const statCards = [
  { key: 'active_vacancies', label: 'Active Vacancies', icon: Briefcase, color: 'blue' },
  { key: 'total_candidates', label: 'Total Candidates', icon: Users, color: 'green' },
  { key: 'apps_this_month', label: 'Applications This Month', icon: CalendarCheck, color: 'purple' },
  { key: 'pending_interviews', label: 'Pending Interviews', icon: CalendarCheck, color: 'orange' },
  { key: 'pending_offers', label: 'Pending Offers', icon: Mail, color: 'pink' },
  { key: 'overdue_followups', label: 'Overdue Follow-ups', icon: AlertCircle, color: 'red' },
];

const colorMap = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  purple: 'bg-purple-50 text-purple-600',
  orange: 'bg-orange-50 text-orange-600',
  pink: 'bg-pink-50 text-pink-600',
  red: 'bg-red-50 text-red-600',
};

export default function Dashboard() {
  const [summary, setSummary] = useState({});
  const [activity, setActivity] = useState([]);
  const [pipeline, setPipeline] = useState([]);

  useEffect(() => {
    api.get('/dashboard/summary').then(r => setSummary(r.data.data));
    api.get('/dashboard/recent-activity').then(r => setActivity(r.data.data));
    api.get('/dashboard/pipeline-summary').then(r => setPipeline(r.data.data));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex gap-2">
          <Link to="/candidates/new" className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={16} /> Add Candidate
          </Link>
          <Link to="/vacancies/new" className="flex items-center gap-1.5 px-3 py-2 bg-white text-gray-700 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
            <Plus size={16} /> Create Vacancy
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map(card => (
          <div key={card.key} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colorMap[card.color]}`}>
              <card.icon size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{summary[card.key] ?? '-'}</p>
            <p className="text-xs text-gray-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Summary</h2>
          {pipeline.length === 0 ? (
            <p className="text-sm text-gray-500">No active applications yet.</p>
          ) : (
            <div className="space-y-2">
              {pipeline.map(s => (
                <div key={s.current_stage} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-gray-600 capitalize">{s.current_stage.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-semibold text-gray-900 bg-gray-100 px-2.5 py-0.5 rounded-full">{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          {activity.length === 0 ? (
            <p className="text-sm text-gray-500">No recent activity.</p>
          ) : (
            <div className="space-y-3">
              {activity.map((a, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <div>
                    <span className="font-medium text-gray-800">{a.full_name}</span>
                    <span className="text-gray-500"> moved to </span>
                    <span className="font-medium text-blue-600 capitalize">{a.to_stage?.replace(/_/g, ' ')}</span>
                    <span className="text-gray-500"> for {a.vacancy_title}</span>
                    <p className="text-xs text-gray-400 mt-0.5">{a.changed_by_name} &middot; {new Date(a.changed_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
