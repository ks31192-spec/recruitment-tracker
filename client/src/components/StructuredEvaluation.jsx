import { useState, useMemo } from 'react';
import api from '../lib/api.js';
import { useToast } from '../components/Toast.jsx';
import { X } from 'lucide-react';

const CATEGORIES = [
  { key: 'communication', label: 'Communication Skills', weight: 20 },
  { key: 'subject_knowledge', label: 'Subject Knowledge', weight: 25 },
  { key: 'teaching_aptitude', label: 'Teaching Demo / Aptitude', weight: 25 },
  { key: 'confidence_personality', label: 'Confidence & Personality', weight: 15 },
  { key: 'tech_comfort', label: 'Technology Comfort', weight: 5 },
  { key: 'cultural_fit', label: 'Cultural Fit', weight: 10 },
];

function ScoreCircle({ score, max = 100 }) {
  const pct = (score / max) * 100;
  const color = pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-blue-600' : pct >= 40 ? 'text-yellow-600' : 'text-red-600';
  return (
    <div className="relative w-24 h-24">
      <svg viewBox="0 0 36 36" className="w-full h-full">
        <circle cx="18" cy="18" r="15.91" fill="none" stroke="#e5e7eb" strokeWidth="2.5" />
        <circle cx="18" cy="18" r="15.91" fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset="25"
          className={color} strokeLinecap="round" />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${color}`}>{Math.round(score)}</span>
    </div>
  );
}

function StarRating({ value, onChange, label, weight }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-400">Weight: {weight}%</p>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <button key={i} type="button" onClick={() => onChange(i)}
            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-colors ${
              i <= value
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-gray-300 text-gray-400 hover:border-blue-400'
            }`}>
            {i}
          </button>
        ))}
      </div>
    </div>
  );
}

const RECOMMENDATIONS = [
  { value: 'strong_yes', label: 'Strong Yes', cls: 'border-green-500 bg-green-50 text-green-700' },
  { value: 'yes', label: 'Yes', cls: 'border-blue-500 bg-blue-50 text-blue-700' },
  { value: 'maybe', label: 'Maybe', cls: 'border-amber-500 bg-amber-50 text-amber-700' },
  { value: 'no', label: 'No', cls: 'border-red-500 bg-red-50 text-red-700' },
];

export default function StructuredEvaluation({ interviewId, onClose, onDone }) {
  const toast = useToast();
  const [ratings, setRatings] = useState(
    Object.fromEntries(CATEGORIES.map(c => [c.key, 0]))
  );
  const [recommendation, setRecommendation] = useState('');
  const [strengths, setStrengths] = useState('');
  const [concerns, setConcerns] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setRating = (key, val) => setRatings(r => ({ ...r, [key]: val }));

  const weightedScore = useMemo(() => {
    let total = 0;
    let weightSum = 0;
    for (const cat of CATEGORIES) {
      if (ratings[cat.key] > 0) {
        total += (ratings[cat.key] / 5) * cat.weight;
        weightSum += cat.weight;
      }
    }
    if (weightSum === 0) return 0;
    return (total / weightSum) * 100;
  }, [ratings]);

  const allRated = CATEGORIES.every(c => ratings[c.key] > 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!allRated) { setError('Please rate all categories'); return; }
    if (!recommendation) { setError('Please select a recommendation'); return; }
    setSaving(true);
    setError('');
    try {
      // Map structured form to existing evaluation schema fields
      await api.post(`/interviews/${interviewId}/evaluate`, {
        subject_knowledge: ratings.subject_knowledge * 2,
        communication: ratings.communication * 2,
        teaching_aptitude: ratings.teaching_aptitude * 2,
        confidence_personality: ratings.confidence_personality * 2,
        tech_comfort: ratings.tech_comfort * 2,
        overall_impression: Math.round(weightedScore / 10),
        strengths,
        concerns,
        recommendation,
        private_notes: privateNotes,
      });
      toast.success('Evaluation submitted');
      onDone?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit evaluation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Structured Evaluation</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}

          {/* Weighted Score Circle */}
          <div className="flex flex-col items-center gap-1">
            <ScoreCircle score={weightedScore} />
            <p className="text-xs text-gray-500 mt-1">Weighted Score</p>
          </div>

          {/* Category Ratings */}
          <div className="space-y-1 divide-y divide-gray-100">
            {CATEGORIES.map(cat => (
              <StarRating
                key={cat.key}
                label={cat.label}
                weight={cat.weight}
                value={ratings[cat.key]}
                onChange={v => setRating(cat.key, v)}
              />
            ))}
          </div>

          {/* Recommendation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Recommendation *</label>
            <div className="grid grid-cols-4 gap-2">
              {RECOMMENDATIONS.map(r => (
                <button key={r.value} type="button" onClick={() => setRecommendation(r.value)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
                    recommendation === r.value ? r.cls : 'border-gray-200 text-gray-500 hover:border-gray-400'
                  }`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text Areas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Strengths</label>
            <textarea value={strengths} onChange={e => setStrengths(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Key strengths observed..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Areas of Concern</label>
            <textarea value={concerns} onChange={e => setConcerns(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Any concerns or areas needing improvement..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Private Notes</label>
            <p className="text-xs text-gray-400 mb-1">Visible to super_admin only</p>
            <textarea value={privateNotes} onChange={e => setPrivateNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Confidential notes..." />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Submitting...' : 'Submit Evaluation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
