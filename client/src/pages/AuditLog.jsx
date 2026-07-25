import { useState, useEffect } from 'react';
import api from '../lib/api.js';
import { Shield, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filters, setFilters] = useState({ entity_type: '', action: '' });

  useEffect(() => {
    const params = { page, limit: 50 };
    if (filters.entity_type) params.entity_type = filters.entity_type;
    if (filters.action) params.action = filters.action;
    api.get('/audit', { params }).then(r => {
      setLogs(r.data.data.logs);
      setTotal(r.data.data.total);
      setPages(r.data.data.pages);
    });
  }, [page, filters]);

  const entityTypes = ['candidate', 'vacancy', 'application', 'interview', 'offer', 'user', 'department', 'designation'];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="text-blue-600" size={24} />
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        </div>
        <span className="text-sm text-gray-500">{total} entries</span>
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
              {logs.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-500">No audit entries found</td></tr>
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
