import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';
import { Plus, Search, Users, ChevronLeft, ChevronRight } from 'lucide-react';

const sourceLabels = { walk_in: 'Walk-in', naukri: 'Naukri', whatsapp: 'WhatsApp', referral: 'Referral', website: 'Website', direct_call: 'Direct Call', other: 'Other' };
const stageColors = {
  applied: 'bg-gray-100 text-gray-700', shortlisted: 'bg-blue-100 text-blue-700', interview_scheduled: 'bg-indigo-100 text-indigo-700',
  interview_done: 'bg-violet-100 text-violet-700', selected: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700',
  joined: 'bg-green-200 text-green-800', waitlisted: 'bg-amber-100 text-amber-700',
};

export default function Candidates() {
  const [data, setData] = useState({ candidates: [], total: 0, page: 1, pages: 0 });
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    api.get('/candidates', { params: { search: search || undefined, source: source || undefined, page } })
      .then(r => setData(r.data.data));
  }, [search, source, page]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
        <Link to="/candidates/new" className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={16} /> Add Candidate
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, phone, email..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
        </div>
        <select value={source} onChange={e => { setSource(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="">All Sources</option>
          {Object.entries(sourceLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {data.candidates.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Users className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">No candidates found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Phone</th>
                  <th className="text-left px-4 py-3">Latest Vacancy</th>
                  <th className="text-left px-4 py-3">Stage</th>
                  <th className="text-left px-4 py-3">Source</th>
                  <th className="text-left px-4 py-3">Applications</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.candidates.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/candidates/${c.id}`} className="font-medium text-gray-900 hover:text-blue-600">{c.full_name}</Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.phone || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{c.latest_vacancy || '-'}</td>
                    <td className="px-4 py-3">
                      {c.latest_stage && <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${stageColors[c.latest_stage] || 'bg-gray-100 text-gray-600'}`}>{c.latest_stage.replace(/_/g, ' ')}</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{sourceLabels[c.source] || c.source || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{c.application_count || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <span className="text-sm text-gray-500">Page {data.page} of {data.pages} ({data.total} total)</span>
              <div className="flex gap-1">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"><ChevronLeft size={18} /></button>
                <button disabled={page >= data.pages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"><ChevronRight size={18} /></button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
