import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';
import {
  Users, Loader2, MessageSquareText, Phone, Mail, MapPin, FileText,
  CalendarDays, Presentation, CalendarCheck, Search,
} from 'lucide-react';

const BUCKETS = [
  { key: 'not_interviewed', label: 'Not Interviewed', dot: 'bg-gray-400', chip: 'bg-gray-100 text-gray-700', ring: 'border-gray-200' },
  { key: 'interview_only', label: 'Interview Only', dot: 'bg-indigo-500', chip: 'bg-indigo-100 text-indigo-700', ring: 'border-indigo-200' },
  { key: 'demo_done', label: 'Demo Done', dot: 'bg-cyan-500', chip: 'bg-cyan-100 text-cyan-700', ring: 'border-cyan-200' },
  { key: 'selected', label: 'Selected', dot: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-700', ring: 'border-emerald-200' },
  { key: 'rejected', label: 'Rejected', dot: 'bg-red-500', chip: 'bg-red-100 text-red-700', ring: 'border-red-200' },
];

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtDateTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function CandidateRow({ row, bucket }) {
  return (
    <div className={`border ${bucket.ring} rounded-xl p-4 bg-white`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/candidates/${row.candidate_id}`} className="font-semibold text-gray-900 hover:text-blue-600">
              {row.full_name}
            </Link>
            {/* Exact pipeline stage, so nothing is hidden by the grouping */}
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
              {(row.current_stage || '').replace(/_/g, ' ')}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1 font-medium text-gray-600">
              <CalendarDays size={12} /> Applied {fmtDate(row.applied_date)}
            </span>
            {row.phone && <span className="flex items-center gap-1"><Phone size={12} />{row.phone}</span>}
            {row.email && <span className="flex items-center gap-1"><Mail size={12} />{row.email}</span>}
            {row.current_city && <span className="flex items-center gap-1"><MapPin size={12} />{row.current_city}</span>}
            {row.expected_salary ? <span>Expected ₹{Number(row.expected_salary).toLocaleString('en-IN')}</span> : null}
          </div>
          <p className="text-xs text-gray-400 mt-1">Applied for: {row.vacancy_title}</p>
        </div>
        {row.resume_path && (
          <a href={`/uploads/${row.resume_path.replace(/^uploads[\\/]/, '')}`} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 shrink-0">
            <FileText size={13} /> Resume
          </a>
        )}
      </div>

      {row.current_stage === 'rejected' && row.rejection_reason && (
        <p className="mt-2 text-xs text-red-600">Reason: {row.rejection_reason}</p>
      )}

      {row.remarks.length > 0 ? (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2.5">
          {row.remarks.map(rm => {
            const isDemo = rm.interview_type === 'demo';
            const Icon = isDemo ? Presentation : CalendarCheck;
            return (
              <div key={rm.id} className="flex items-start gap-2">
                <Icon size={14} className={`mt-0.5 shrink-0 ${isDemo ? 'text-cyan-600' : 'text-indigo-600'}`} />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500">
                    {isDemo ? 'Demo' : 'Interview'} · {fmtDate(rm.scheduled_date)}
                  </p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap mt-0.5">{rm.remarks}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {rm.remarks_by_name ? `${rm.remarks_by_name} · ` : ''}{fmtDateTime(rm.remarks_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400 italic flex items-center gap-1.5">
          <MessageSquareText size={13} /> No interviewer remarks yet.
        </p>
      )}
    </div>
  );
}

export default function TalentPool() {
  const [options, setOptions] = useState({ designations: [], subjects: [] });
  const [designationId, setDesignationId] = useState('');
  const [subject, setSubject] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/talent-pool/options')
      .then(r => setOptions(r.data.data))
      .catch(() => {});
  }, []);

  const search = () => {
    setLoading(true);
    const params = {};
    if (designationId) params.designation_id = designationId;
    if (subject) params.subject = subject;
    api.get('/talent-pool', { params })
      .then(r => setData(r.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  // Show the full pool on first load so the page is never blank.
  useEffect(() => { search(); }, []);

  const designationName = options.designations.find(d => String(d.id) === String(designationId))?.title;
  const roleLabel = [designationName, subject].filter(Boolean).join(' ') || 'All roles';

  return (
    <div>
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-6 mb-6 text-white">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users size={24} /> Talent Pool</h1>
        <p className="text-slate-300 mt-1 text-sm">
          Pick a role to see every candidate for it, grouped by how far they got.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="grid md:grid-cols-[1fr_1fr_auto] gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Designation</label>
            <select value={designationId} onChange={e => setDesignationId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">All designations</option>
              {options.designations.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
            <select value={subject} onChange={e => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">All subjects</option>
              {options.subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={search} disabled={loading}
              className="w-full md:w-auto flex items-center justify-center gap-1.5 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Show
            </button>
          </div>
        </div>
      </div>

      {loading && !data && (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-blue-500" /></div>
      )}

      {data && (
        <>
          <div className="flex items-baseline gap-2 mb-3 flex-wrap">
            <h2 className="text-lg font-semibold text-gray-900">{roleLabel}</h2>
            <span className="text-sm text-gray-500">{data.total} candidate{data.total === 1 ? '' : 's'}</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {BUCKETS.map(b => (
              <div key={b.key} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${b.dot}`} />
                  <span className="text-xs font-medium text-gray-500">{b.label}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-1">{data.counts[b.key]}</p>
              </div>
            ))}
          </div>

          {data.total === 0 ? (
            <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>No candidates have applied for this role yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {BUCKETS.map(b => {
                const rows = data.buckets[b.key];
                if (!rows.length) return null;
                return (
                  <section key={b.key}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${b.dot}`} />
                      <h3 className="font-semibold text-gray-900">{b.label}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${b.chip}`}>{rows.length}</span>
                    </div>
                    <div className="space-y-2.5">
                      {rows.map(row => <CandidateRow key={row.application_id} row={row} bucket={b} />)}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
