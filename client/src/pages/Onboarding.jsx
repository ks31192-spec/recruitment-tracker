import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';
import { useToast } from '../components/Toast.jsx';
import { UserCheck, ChevronDown, ChevronUp, CheckCircle2, Circle, Check, Briefcase, Phone, Calendar } from 'lucide-react';

export default function Onboarding() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(new Set());
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(null);
  const toast = useToast();

  const load = () => {
    setLoading(true);
    api.get('/offers/onboarding')
      .then(r => {
        setOffers(r.data.data);
        const d = {};
        r.data.data.forEach(o => { d[o.id] = o.onboarding; });
        setDrafts(d);
      })
      .catch(() => toast.error('Failed to load onboarding'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggle = (id) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleItem = (offerId, idx) => {
    setDrafts(d => ({ ...d, [offerId]: d[offerId].map((it, i) => i === idx ? { ...it, done: !it.done } : it) }));
  };

  const save = async (offerId) => {
    setSaving(offerId);
    try {
      const r = await api.put(`/offers/${offerId}/onboarding`, { onboarding: drafts[offerId] });
      setDrafts(d => ({ ...d, [offerId]: r.data.data }));
      setOffers(os => os.map(o => o.id === offerId ? { ...o, onboarding: r.data.data, done_count: r.data.data.filter(i => i.done).length } : o));
      toast.success('Onboarding progress saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(null); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 p-6 mb-6 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Onboarding</h1>
            <p className="text-white/70 text-sm mt-1">Track new hire onboarding progress</p>
          </div>
          <button onClick={load} className="px-3 py-2 text-sm bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors">Refresh</button>
        </div>
      </div>

      {offers.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <UserCheck size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-700 font-medium">No one is being onboarded yet</p>
          <p className="text-gray-500 text-sm mt-1">Candidates appear here once their offer is accepted or they have joined.</p>
        </div>
      )}

      <div className="space-y-4">
        {offers.map(o => {
          const items = drafts[o.id] || o.onboarding;
          const done = items.filter(i => i.done).length;
          const pct = items.length ? Math.round((done / items.length) * 100) : 0;
          const isOpen = expanded.has(o.id);
          return (
            <div key={o.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button onClick={() => toggle(o.id)} className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left">
                <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                  {o.full_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link to={`/candidates/${o.candidate_id}`} onClick={e => e.stopPropagation()} className="font-semibold text-gray-900 hover:text-blue-600 truncate">{o.full_name}</Link>
                    {o.actually_joined ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-green-100 text-green-700 rounded-full">JOINED</span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">ACCEPTED</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1"><Briefcase size={12} />{o.vacancy_title}</span>
                    {o.phone && <span className="flex items-center gap-1"><Phone size={12} />{o.phone}</span>}
                    {(o.actual_joining_date || o.joining_date_proposed) && (
                      <span className="flex items-center gap-1"><Calendar size={12} />{new Date(o.actual_joining_date || o.joining_date_proposed).toLocaleDateString('en-IN')}</span>
                    )}
                  </div>
                </div>
                <div className="hidden sm:flex flex-col items-end gap-1 w-40 shrink-0">
                  <span className="text-xs text-gray-500">{done}/{items.length} done</span>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                {isOpen ? <ChevronUp size={18} className="text-gray-400 shrink-0" /> : <ChevronDown size={18} className="text-gray-400 shrink-0" />}
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 p-4">
                  <div className="grid sm:grid-cols-2 gap-2">
                    {items.map((it, idx) => (
                      <button key={idx} onClick={() => toggleItem(o.id, idx)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left text-sm transition-colors ${it.done ? 'bg-green-50 border-green-200' : 'border-gray-200 hover:bg-gray-50'}`}>
                        {it.done ? <CheckCircle2 size={18} className="text-green-600 shrink-0" /> : <Circle size={18} className="text-gray-300 shrink-0" />}
                        <div className="min-w-0">
                          <p className={`${it.done ? 'text-green-800' : 'text-gray-700'}`}>{it.item}</p>
                          {it.done && it.done_by && <p className="text-[11px] text-green-600 mt-0.5">{it.done_by} · {it.done_at ? new Date(it.done_at).toLocaleDateString('en-IN') : ''}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-end mt-4">
                    <button onClick={() => save(o.id)} disabled={saving === o.id}
                      className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      <Check size={15} /> {saving === o.id ? 'Saving...' : 'Save Progress'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
