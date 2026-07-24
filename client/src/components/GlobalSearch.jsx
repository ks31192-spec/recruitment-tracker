import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api.js';
import { Search, Briefcase, Users, X } from 'lucide-react';

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ candidates: [], vacancies: [] });
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setOpen(true); }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); }
    else { setQuery(''); setResults({ candidates: [], vacancies: [] }); }
  }, [open]);

  useEffect(() => {
    if (!query || query.length < 2) { setResults({ candidates: [], vacancies: [] }); return; }
    const t = setTimeout(async () => {
      const [cands, vacs] = await Promise.all([
        api.get('/candidates', { params: { search: query, page: 1 } }),
        api.get('/vacancies', { params: { status: 'all' } }),
      ]);
      setResults({
        candidates: cands.data.data.candidates?.slice(0, 5) || [],
        vacancies: (vacs.data.data || []).filter(v =>
          v.title.toLowerCase().includes(query.toLowerCase()) ||
          (v.subject || '').toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5),
      });
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const go = (path) => { navigate(path); setOpen(false); };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-black/40 flex items-start justify-center pt-[15vh]" onClick={() => setOpen(false)}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <Search size={18} className="text-gray-400" />
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search candidates, vacancies..."
            className="flex-1 outline-none text-sm" />
          <kbd className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Esc</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {results.candidates.length === 0 && results.vacancies.length === 0 && query.length >= 2 && (
            <p className="text-sm text-gray-500 text-center py-8">No results found</p>
          )}
          {results.candidates.length > 0 && (
            <div className="p-2">
              <p className="text-xs font-semibold text-gray-400 uppercase px-2 py-1">Candidates</p>
              {results.candidates.map(c => (
                <button key={c.id} onClick={() => go(`/candidates/${c.id}`)} className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 text-sm">
                  <Users size={16} className="text-gray-400 shrink-0" />
                  <div><p className="font-medium text-gray-900">{c.full_name}</p><p className="text-xs text-gray-500">{c.phone || c.email || ''}</p></div>
                </button>
              ))}
            </div>
          )}
          {results.vacancies.length > 0 && (
            <div className="p-2 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase px-2 py-1">Vacancies</p>
              {results.vacancies.map(v => (
                <button key={v.id} onClick={() => go(`/vacancies/${v.id}`)} className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 text-sm">
                  <Briefcase size={16} className="text-gray-400 shrink-0" />
                  <div><p className="font-medium text-gray-900">{v.title}</p><p className="text-xs text-gray-500">{v.department_name} {v.subject ? `- ${v.subject}` : ''}</p></div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
