import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api.js';
import { Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import { TableSkeleton, EmptyState, ErrorState } from '../components/States.jsx';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filters, setFilters] = useState({ entity_type: '', action: '' });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    const params = { page, limit: 50 };
    if (filters.entity_type) params.entity_type = filters.entity_type;
    if (filters.action) params.action = filters.action;
    api.get('/audit', { params })
      .then(r => {
        setLogs(r.data.data.logs || []);
        setTotal(r.data.data.total);
        setPages(r.data.data.pages);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [page, filters]);

  useEffect(load, [load]);

  const entityTypes = ['candidate', 'vacancy', 'application', 'interview', 'offer', 'user', 'department', 'designation'];

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-700 to-slate-600 p-6 mb-1 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Audit Log</h1>
            <p className="text-white/70 text-sm mt-1">Track all system activity and changes</p>
          </div>
          <span className="text-sm text-white/60 bg-white/10 px-3 py-1 rounded-full">{total} entries</span>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select value={filters.entity_type} onChange={e => { setFilters(f => ({ ...f, entity_type: e.target.value })); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">All Entities</option>
          {entityTypes.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
        </select>
        <input value={filters.action} onChange={e => { setFilters(f => ({ ...f, action: e.target.value })); setPage(1); }}
          placeholder="Search action..." className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-48" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Time</th>
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Action</th>
                <th className="text-left px-4 py-3">Entity</th>
                <th className="text-left px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-5"><TableSkeleton rows={6} cols={5} /></td></tr>
              ) : failed ? (
                <tr><td colSpan={5}><ErrorState message="Could not load the audit log." onRetry={load} /></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5}>
                  <EmptyState
                    icon={Shield}
                    tone="slate"
                    title="No audit entries found"
                    hint={filters.entity_type || filters.action ? 'No activity matches these filters.' : 'Activity is recorded here as people use the system.'}
                  />
                </td></tr>
              ) : logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{log.user_name || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      log.action.includes('create') || log.action.includes('add') ? 'bg-green-100 text-green-700' :
                      log.action.includes('delete') || log.action.includes('remove') ? 'bg-red-100 text-red-700' :
                      log.action.includes('update') || log.action.includes('change') ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>{log.action}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{log.entity_type}{log.entity_id ? ` #${log.entity_id}` : ''}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{log.details || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <span className="text-sm text-gray-500">Page {page} of {pages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"><ChevronLeft size={18} /></button>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"><ChevronRight size={18} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
