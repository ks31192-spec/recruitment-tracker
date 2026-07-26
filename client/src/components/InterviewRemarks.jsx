import { useState, useEffect } from 'react';
import api from '../lib/api.js';
import { useToast } from './Toast.jsx';
import { CalendarCheck, Presentation, Video, Building, Clock, MapPin, MessageSquareText, Save, Loader2, Pencil } from 'lucide-react';

const statusColors = {
  scheduled: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700',
  no_show: 'bg-red-100 text-red-700', cancelled: 'bg-gray-100 text-gray-600', rescheduled: 'bg-amber-100 text-amber-700',
};
const STATUS_OPTIONS = ['scheduled', 'completed', 'no_show', 'cancelled', 'rescheduled'];

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtDateTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function InterviewCard({ item, onSaved }) {
  const toast = useToast();
  const isDemo = item.interview_type === 'demo';
  const [editing, setEditing] = useState(false);
  const [remarks, setRemarks] = useState(item.remarks || '');
  const [status, setStatus] = useState(item.status || 'scheduled');
  const [saving, setSaving] = useState(false);
  const Icon = isDemo ? Presentation : CalendarCheck;

  const save = async () => {
    setSaving(true);
    try {
      const r = await api.put(`/interviews/${item.id}/remarks`, { remarks: remarks.trim(), status });
      toast.success('Remarks saved');
      setEditing(false);
      onSaved(r.data.data);
    } catch {
      toast.error('Failed to save remarks');
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setRemarks(item.remarks || '');
    setStatus(item.status || 'scheduled');
    setEditing(false);
  };

  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isDemo ? 'bg-cyan-100 text-cyan-600' : 'bg-indigo-100 text-indigo-600'}`}>
            <Icon size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900">{isDemo ? 'Demo' : 'Interview'}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColors[item.status] || 'bg-gray-100 text-gray-600'}`}>{(item.status || 'scheduled').replace(/_/g, ' ')}</span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{item.vacancy_title}</p>
            <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
              <span className="flex items-center gap-1"><Clock size={12} />{fmtDate(item.scheduled_date)}{item.scheduled_time ? ` · ${item.scheduled_time}` : ''}</span>
              {item.mode && <span className="flex items-center gap-1">{item.mode === 'online' ? <Video size={12} /> : <Building size={12} />}{item.mode === 'online' ? 'Online' : 'In-person'}</span>}
              {item.location_or_link && <span className="flex items-center gap-1"><MapPin size={12} />{item.location_or_link}</span>}
              {isDemo && item.demo_topic && <span>Topic: {item.demo_topic}</span>}
              {isDemo && item.demo_class && <span>Class: {item.demo_class}</span>}
            </div>
          </div>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 shrink-0">
            <Pencil size={13} /> {item.remarks ? 'Edit Remarks' : 'Add Remarks'}
          </button>
        )}
      </div>

      {/* Remarks area */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Remarks after {isDemo ? 'demo' : 'interview'}</label>
              <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={4}
                placeholder={`Write your remarks about the candidate's ${isDemo ? 'demo class' : 'interview'} — performance, strengths, concerns, decision...`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)}
                  className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm capitalize focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div className="flex gap-2 self-end ml-auto">
                <button onClick={cancel} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={save} disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                </button>
              </div>
            </div>
          </div>
        ) : item.remarks ? (
          <div className="flex items-start gap-2">
            <MessageSquareText size={16} className="text-gray-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{item.remarks}</p>
              {item.remarks_at && (
                <p className="text-xs text-gray-400 mt-1.5">
                  {item.remarks_by_name ? `${item.remarks_by_name} · ` : ''}{fmtDateTime(item.remarks_at)}
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No remarks yet.</p>
        )}
      </div>
    </div>
  );
}

export default function InterviewRemarks({ candidateId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get(`/interviews/candidate/${candidateId}`)
      .then(r => setItems(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (candidateId) load(); }, [candidateId]);

  const handleSaved = (updated) => {
    setItems(list => list.map(it => it.id === updated.id ? { ...it, ...updated } : it));
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;

  if (!items.length) {
    return (
      <div className="text-center py-12 text-gray-400">
        <CalendarCheck className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p>No interviews or demos scheduled yet.</p>
        <p className="text-xs mt-1">Schedule one from the Applications tab, then add your remarks here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map(item => (
        <InterviewCard key={item.id} item={item} onSaved={handleSaved} />
      ))}
    </div>
  );
}
