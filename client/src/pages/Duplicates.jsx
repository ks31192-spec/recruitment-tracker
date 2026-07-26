import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';
import { useToast } from '../components/Toast.jsx';
import { AlertTriangle, Merge, Phone, Mail, User, ChevronDown, ChevronUp, Check } from 'lucide-react';

const matchLabels = { phone: 'Same Phone', email: 'Same Email', name: 'Same Name + Father Name' };
const matchColors = { phone: 'bg-red-100 text-red-700', email: 'bg-orange-100 text-orange-700', name: 'bg-yellow-100 text-yellow-700' };

export default function Duplicates() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const [keepId, setKeepId] = useState({});
  const [confirmMerge, setConfirmMerge] = useState(null);
  const toast = useToast();

  const load = () => {
    setLoading(true);
    api.get('/candidates/duplicates')
      .then(r => {
        setGroups(r.data.data);
        const exp = new Set();
        r.data.data.forEach((_, i) => exp.add(i));
        setExpanded(exp);
      })
      .catch(() => toast.error('Failed to load duplicates'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggle = (i) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const handleMerge = async (groupIdx) => {
    const group = groups[groupIdx];
    const keep = keepId[groupIdx];
    if (!keep) { toast.error('Select which candidate to keep'); return; }
    const mergeIds = group.candidates.filter(c => c.id !== keep).map(c => c.id);

    setMerging(groupIdx);
    try {
      for (const mid of mergeIds) {
        await api.post('/candidates/merge', { keep_id: keep, merge_id: mid });
      }
      toast.success('Candidates merged successfully');
      setConfirmMerge(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Merge failed');
    } finally {
      setMerging(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-6 mb-6 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Duplicate Candidates</h1>
            <p className="text-white/70 text-sm mt-1">Find and merge duplicate candidate records</p>
            <p className="text-white/50 text-xs mt-1">
              {groups.length === 0 ? 'No duplicates found' : `${groups.length} potential duplicate group${groups.length > 1 ? 's' : ''} detected`}
            </p>
          </div>
          <button onClick={load} className="px-3 py-2 text-sm bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors">
            Refresh
          </button>
        </div>
      </div>

      {groups.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <Check size={40} className="mx-auto text-green-500 mb-3" />
          <p className="text-green-800 font-medium">No duplicate candidates found</p>
          <p className="text-green-600 text-sm mt-1">All candidate records appear to be unique</p>
        </div>
      )}

      <div className="space-y-4">
        {groups.map((group, gi) => (
          <div key={gi} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <button onClick={() => toggle(gi)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <AlertTriangle size={18} className="text-amber-500" />
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${matchColors[group.match_type]}`}>
                  {matchLabels[group.match_type]}
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {group.match_value}
                </span>
                <span className="text-xs text-gray-400">
                  {group.candidates.length} records
                </span>
              </div>
              {expanded.has(gi) ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
            </button>

            {expanded.has(gi) && (
              <div className="border-t border-gray-100 p-4">
                <p className="text-xs text-gray-500 mb-3">Select the candidate to keep — all others will be merged into it:</p>
                <div className="grid gap-3">
                  {group.candidates.map(c => {
                    const isKeep = keepId[gi] === c.id;
                    return (
                      <label key={c.id}
                        className={`flex items-center gap-4 p-3 rounded-lg border-2 cursor-pointer transition-all ${isKeep ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input
                          type="radio" name={`keep-${gi}`} value={c.id}
                          checked={isKeep}
                          onChange={() => setKeepId(prev => ({ ...prev, [gi]: c.id }))}
                          className="accent-blue-600"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Link to={`/candidates/${c.id}`} className="font-medium text-gray-900 hover:text-blue-600" onClick={e => e.stopPropagation()}>
                              {c.full_name}
                            </Link>
                            {c.father_or_husband_name && (
                              <span className="text-xs text-gray-400">s/o {c.father_or_husband_name}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            {c.phone && <span className="flex items-center gap-1"><Phone size={12} />{c.phone}</span>}
                            {c.email && <span className="flex items-center gap-1"><Mail size={12} />{c.email}</span>}
                            <span className="flex items-center gap-1"><User size={12} />ID #{c.id}</span>
                            <span>Added {new Date(c.created_at).toLocaleDateString('en-IN')}</span>
                          </div>
                        </div>
                        {isKeep && <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded">KEEP</span>}
                      </label>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center justify-end gap-3">
                  {confirmMerge === gi ? (
                    <>
                      <span className="text-sm text-amber-600">Are you sure? This cannot be undone.</span>
                      <button onClick={() => setConfirmMerge(null)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                        Cancel
                      </button>
                      <button onClick={() => handleMerge(gi)} disabled={merging === gi}
                        className="px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
                        {merging === gi ? 'Merging...' : <><Merge size={14} /> Confirm Merge</>}
                      </button>
                    </>
                  ) : (
                    <button onClick={() => { if (!keepId[gi]) { toast.error('Select which candidate to keep first'); return; } setConfirmMerge(gi); }}
                      disabled={!keepId[gi]}
                      className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                      <Merge size={14} /> Merge Duplicates
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
