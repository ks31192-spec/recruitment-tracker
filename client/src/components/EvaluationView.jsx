import { useState, useEffect } from 'react';
import api from '../lib/api.js';
import { X } from 'lucide-react';

const criteria = [
  { key: 'subject_knowledge', label: 'Subject Knowledge' },
  { key: 'communication', label: 'Communication' },
  { key: 'teaching_aptitude', label: 'Teaching Aptitude' },
  { key: 'confidence_personality', label: 'Confidence' },
  { key: 'tech_comfort', label: 'Tech Comfort' },
  { key: 'overall_impression', label: 'Overall' },
];

const recColors = { strong_yes: 'text-green-700 bg-green-100', yes: 'text-blue-700 bg-blue-100', maybe: 'text-amber-700 bg-amber-100', no: 'text-red-700 bg-red-100' };

export default function EvaluationView({ interviewId, onClose }) {
  const [evals, setEvals] = useState([]);

  useEffect(() => {
    api.get(`/interviews/${interviewId}/evaluations`).then(r => setEvals(r.data.data));
  }, [interviewId]);

  if (!evals.length) return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md text-center">
        <p className="text-gray-500 mb-4">No evaluations submitted yet.</p>
        <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Evaluations ({evals.length})</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 text-xs text-gray-500">Evaluator</th>
                  {criteria.map(c => <th key={c.key} className="text-center py-2 px-2 text-xs text-gray-500">{c.label}</th>)}
                  <th className="text-center py-2 px-2 text-xs text-gray-500">Avg</th>
                  <th className="text-center py-2 px-2 text-xs text-gray-500">Rec</th>
                </tr>
              </thead>
              <tbody>
                {evals.map(ev => {
                  const avg = (criteria.reduce((s, c) => s + (ev[c.key] || 0), 0) / criteria.length).toFixed(1);
                  return (
                    <tr key={ev.id} className="border-b border-gray-100">
                      <td className="py-2.5 px-2 font-medium text-gray-900">{ev.evaluator_name}</td>
                      {criteria.map(c => (
                        <td key={c.key} className="text-center py-2.5 px-2">
                          <span className={`inline-block w-8 py-0.5 rounded text-xs font-semibold ${(ev[c.key] || 0) >= 7 ? 'bg-green-100 text-green-700' : (ev[c.key] || 0) >= 4 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{ev[c.key]}</span>
                        </td>
                      ))}
                      <td className="text-center py-2.5 px-2 font-bold text-gray-900">{avg}</td>
                      <td className="text-center py-2.5 px-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${recColors[ev.recommendation] || 'bg-gray-100'}`}>
                          {ev.recommendation?.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {evals.some(e => e.strengths || e.concerns) && (
            <div className="mt-5 space-y-4">
              {evals.filter(e => e.strengths || e.concerns).map(ev => (
                <div key={ev.id} className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-900 mb-2">{ev.evaluator_name}</p>
                  {ev.strengths && <p className="text-sm text-gray-600"><span className="font-medium text-green-700">Strengths:</span> {ev.strengths}</p>}
                  {ev.concerns && <p className="text-sm text-gray-600 mt-1"><span className="font-medium text-red-700">Concerns:</span> {ev.concerns}</p>}
                  {ev.private_notes && <p className="text-sm text-gray-600 mt-1"><span className="font-medium text-purple-700">Private Notes:</span> {ev.private_notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
