import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';
import { Plus, Briefcase, Users, MapPin } from 'lucide-react';

const tabs = ['open', 'interviewing', 'filled', 'closed', 'all'];
const statusColors = {
  open: 'bg-green-100 text-green-700',
  interviewing: 'bg-blue-100 text-blue-700',
  filled: 'bg-purple-100 text-purple-700',
  closed: 'bg-gray-100 text-gray-700',
  reopened: 'bg-orange-100 text-orange-700',
};

export default function Vacancies() {
  const [vacancies, setVacancies] = useState([]);
  const [tab, setTab] = useState('open');

  useEffect(() => {
    api.get('/vacancies', { params: { status: tab } }).then(r => setVacancies(r.data.data));
  }, [tab]);

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 p-6 mb-6 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Vacancies</h1>
            <p className="text-white/70 text-sm mt-1">Manage open positions and track hiring progress</p>
          </div>
          <Link to="/vacancies/new" className="flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg transition-colors">
            <Plus size={16} /> Create Vacancy
          </Link>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-md capitalize transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            {t}
          </button>
        ))}
      </div>

      {vacancies.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Briefcase className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">No vacancies found</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vacancies.map(v => (
            <Link key={v.id} to={`/vacancies/${v.id}`} className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{v.title}</h3>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColors[v.status] || 'bg-gray-100'}`}>{v.status}</span>
              </div>
              {v.department_name && <p className="text-sm text-gray-500 mb-1">{v.department_name} {v.subject ? `- ${v.subject}` : ''}</p>}
              {v.designation_title && <p className="text-sm text-gray-500 mb-3">{v.designation_title}</p>}
              <div className="flex items-center gap-4 text-xs text-gray-400 pt-3 border-t border-gray-100">
                <span className="flex items-center gap-1"><Users size={14} /> {v.applicant_count || 0} applicants</span>
                <span>{v.positions_filled || 0}/{v.positions_count} filled</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
