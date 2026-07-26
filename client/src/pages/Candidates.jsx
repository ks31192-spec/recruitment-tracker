import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';
import { Plus, Search, Users, ChevronLeft, ChevronRight, Phone, Mail, MapPin, Download } from 'lucide-react';

const sourceLabels = { walk_in: 'Walk-in', naukri: 'Naukri', whatsapp: 'WhatsApp', referral: 'Referral', website: 'Website', direct_call: 'Direct Call', other: 'Other' };
const sourceColors = {
  walk_in: 'bg-green-100 text-green-700', naukri: 'bg-blue-100 text-blue-700', whatsapp: 'bg-emerald-100 text-emerald-700',
  referral: 'bg-purple-100 text-purple-700', website: 'bg-cyan-100 text-cyan-700', direct_call: 'bg-orange-100 text-orange-700', other: 'bg-gray-100 text-gray-600',
};
const stageColors = {
  applied: 'bg-gray-100 text-gray-700', shortlisted: 'bg-blue-100 text-blue-700', interview_scheduled: 'bg-indigo-100 text-indigo-700',
  interview_done: 'bg-violet-100 text-violet-700', demo_scheduled: 'bg-cyan-100 text-cyan-700', demo_done: 'bg-teal-100 text-teal-700',
  selected: 'bg-green-100 text-green-700', offer_made: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-700',
  joined: 'bg-green-200 text-green-800', waitlisted: 'bg-amber-100 text-amber-700', declined: 'bg-orange-100 text-orange-700',
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

  const handleExport = () => {
    const token = localStorage.getItem('token');
    window.open(`/api/export/candidates?token=${encodeURIComponent(token)}${search ? `&search=${encodeURIComponent(search)}` : ''}${source ? `&source=${encodeURIComponent(source)}` : ''}`, '_blank');
  };

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-6 mb-6 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Candidates</h1>
            {data.total > 0 && <p className="text-white/70 text-sm mt-1">{data.total} total candidates</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors">
              <Download size={16} /> Export CSV
            </button>
            <Link to="/candidates/new" className="flex items-center gap-1.5 px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg transition-colors">
              <Plus size={16} /> Add Candidate
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, phone, email..."
            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
        </div>
        <select value={source} onChange={e => { setSource(e.target.value); setPage(1); }}
          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
          <option value="">All Sources</option>
          {Object.entries(sourceLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {data.candidates.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <Users className="mx-auto text-gray-300 mb-4" size={56} />
          <p className="text-gray-500 text-lg font-medium">No candidates found</p>
          <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
          <Link to="/candidates/new" className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 mt-4">
            <Plus size={16} /> Add First Candidate
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">Candidate</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Contact</th>
                  <th className="text-left px-4 py-3">Latest Vacancy</th>
                  <th className="text-left px-4 py-3">Stage</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Source</th>
                  <th className="text-center px-4 py-3">Apps</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.candidates.map(c => (
                  <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/candidates/${c.id}`} className="flex items-center gap-3 group">
                        {c.photo_path ? (
                          <img src={`/${c.photo_path}`} alt="" className="w-9 h-9 rounded-full object-cover border border-gray-200 flex-shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600 flex-shrink-0">
                            {c.full_name?.charAt(0)?.toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 group-hover:text-blue-600 truncate">{c.full_name}</p>
                          {c.current_city && <p className="text-xs text-gray-400 flex items-center gap-0.5 mt-0.5"><MapPin size={10} />{c.current_city}</p>}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="space-y-0.5">
                        {c.phone && <p className="text-gray-600 flex items-center gap-1 text-xs"><Phone size={12} className="text-gray-400" />{c.phone}</p>}
                        {c.email && <p className="text-gray-500 flex items-center gap-1 text-xs truncate max-w-[180px]"><Mail size={12} className="text-gray-400" />{c.email}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{c.latest_vacancy || <span className="text-gray-400">-</span>}</td>
                    <td className="px-4 py-3">
                      {c.latest_stage ? (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize whitespace-nowrap ${stageColors[c.latest_stage] || 'bg-gray-100 text-gray-600'}`}>
                          {c.latest_stage.replace(/_/g, ' ')}
                        </span>
                      ) : <span className="text-gray-400 text-xs">-</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {c.source ? (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sourceColors[c.source] || 'bg-gray-100 text-gray-600'}`}>
                          {sourceLabels[c.source] || c.source}
                        </span>
                      ) : <span className="text-gray-400 text-xs">-</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.application_count > 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">{c.application_count}</span>
                      ) : <span className="text-gray-400 text-xs">0</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
              <span className="text-sm text-gray-500">
                Showing {(data.page - 1) * 20 + 1}-{Math.min(data.page * 20, data.total)} of {data.total}
              </span>
              <div className="flex items-center gap-1">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition-colors"><ChevronLeft size={18} /></button>
                {Array.from({ length: Math.min(data.pages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, data.pages - 4));
                  const p = start + i;
                  if (p > data.pages) return null;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${p === page ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}>
                      {p}
                    </button>
                  );
                })}
                <button disabled={page >= data.pages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition-colors"><ChevronRight size={18} /></button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
