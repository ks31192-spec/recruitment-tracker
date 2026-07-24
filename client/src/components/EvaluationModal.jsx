import { useState } from 'react';
import api from '../lib/api.js';
import { X, Star } from 'lucide-react';

const criteria = [
  { key: 'subject_knowledge', label: 'Subject Knowledge' },
  { key: 'communication', label: 'Communication Skills' },
  { key: 'teaching_aptitude', label: 'Teaching Aptitude' },
  { key: 'confidence_personality', label: 'Confidence & Personality' },
  { key: 'tech_comfort', label: 'Tech/Digital Comfort' },
  { key: 'overall_impression', label: 'Overall Impression' },
];

function RatingSlider({ value, onChange, label }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-sm font-bold text-blue-600">{value}/10</span>
      </div>
      <input type="range" min="1" max="10" value={value} onChange={e => onChange(+e.target.value)}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
    </div>
  );
}

export default function EvaluationModal({ interviewId, onClose, onDone }) {
  const [form, setForm] = useState({
    subject_knowledge: 5, communication: 5, teaching_aptitude: 5,
    confidence_personality: 5, tech_comfort: 5, overall_impression: 5,
    strengths: '', concerns: '', recommendation: '', private_notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.recommendation) { setError('Please select a recommendation'); return; }
    setSaving(true);
    try {
      await api.post(`/interviews/${interviewId}/evaluate`, form);
      onDone?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Submit Evaluation</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}

          <div className="space-y-4">
            {criteria.map(c => (
              <RatingSlider key={c.key} label={c.label} value={form[c.key]} onChange={v => set(c.key, v)} />
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Strengths</label>
            <textarea value={form.strengths} onChange={e => set('strengths', e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Key strengths observed..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Concerns</label>
            <textarea value={form.concerns} onChange={e => set('concerns', e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Any concerns or areas of improvement..." />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Recommendation *</label>
            <div className="grid grid-cols-4 gap-2">
              {[{ v: 'strong_yes', l: 'Strong Yes', c: 'border-green-500 bg-green-50 text-green-700' }, { v: 'yes', l: 'Yes', c: 'border-blue-500 bg-blue-50 text-blue-700' }, { v: 'maybe', l: 'Maybe', c: 'border-amber-500 bg-amber-50 text-amber-700' }, { v: 'no', l: 'No', c: 'border-red-500 bg-red-50 text-red-700' }].map(r => (
                <button key={r.v} type="button" onClick={() => set('recommendation', r.v)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all ${form.recommendation === r.v ? r.c : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}>
                  {r.l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Private Notes (Principal only)</label>
            <textarea value={form.private_notes} onChange={e => set('private_notes', e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Visible only to the principal..." />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">{saving ? 'Submitting...' : 'Submit Evaluation'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
