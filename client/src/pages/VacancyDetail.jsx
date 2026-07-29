import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../lib/api.js';
import { ArrowLeft, Edit, Copy, Users, ChevronRight, CheckSquare, Square, AlertTriangle, Plus, Trash2, GripVertical, Shield, ShieldAlert, X, ChevronDown, IndianRupee } from 'lucide-react';
import { useToast } from '../components/Toast.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const STAGES = ['applied', 'shortlisted', 'interview_scheduled', 'interview_done', 'demo_scheduled', 'demo_done', 'selected', 'offer_made', 'joined'];
const TERMINAL = ['rejected', 'waitlisted', 'declined', 'no_response'];
const ALL_STAGES = [...STAGES, ...TERMINAL];

const fitStyles = {
  within: 'bg-green-100 text-green-700',
  over: 'bg-red-100 text-red-700',
  under: 'bg-blue-100 text-blue-700',
};

function salaryFit(expected, min, max) {
  if (!expected || (!min && !max)) return null;
  if (max && expected > max) return { label: `${Math.round((expected / max - 1) * 100)}% over`, level: 'over' };
  if (min && expected < min) return { label: 'below range', level: 'under' };
  return { label: 'within budget', level: 'within' };
}

const stageColors = {
  applied: 'bg-gray-100 text-gray-700',
  shortlisted: 'bg-blue-100 text-blue-700',
  interview_scheduled: 'bg-indigo-100 text-indigo-700',
  interview_done: 'bg-violet-100 text-violet-700',
  demo_scheduled: 'bg-cyan-100 text-cyan-700',
  demo_done: 'bg-teal-100 text-teal-700',
  selected: 'bg-green-100 text-green-700',
  offer_made: 'bg-emerald-100 text-emerald-700',
  joined: 'bg-green-200 text-green-800',
  rejected: 'bg-red-100 text-red-700',
  waitlisted: 'bg-amber-100 text-amber-700',
  declined: 'bg-orange-100 text-orange-700',
  no_response: 'bg-gray-200 text-gray-600',
};

function ApplicationCard({ app, selected, onToggle, onStageChange, setStageModal, vacancy }) {
  const fit = salaryFit(app.expected_salary, vacancy?.salary_range_min, vacancy?.salary_range_max);
  return (
    <div className={`bg-white rounded-lg border ${app.is_blacklisted ? 'border-red-300' : 'border-gray-200'} p-3 text-sm`}>
      <div className="flex items-start gap-2">
        <button onClick={() => onToggle(app.id)} className="mt-0.5 shrink-0 text-gray-400 hover:text-blue-600">
          {selected ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Link to={`/candidates/${app.candidate_id}`} className="font-medium text-gray-900 hover:text-blue-600 truncate">{app.full_name}</Link>
            {app.is_blacklisted && (
              <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-red-100 text-red-700 rounded-full">
                <ShieldAlert size={10} /> Blacklisted
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <p className="text-xs text-gray-500">{app.phone}</p>
            {fit && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${fitStyles[fit.level]}`}>{fit.label}</span>}
          </div>
          <div className="mt-2">
            <select value="" onChange={e => {
              const val = e.target.value;
              if (['rejected', 'waitlisted', 'declined'].includes(val)) { setStageModal({ appId: app.id, stage: val }); }
              else if (val) onStageChange(app.id, val);
            }} className="w-full text-xs border border-gray-200 rounded px-1.5 py-1 text-gray-600">
              <option value="">Move to...</option>
              {ALL_STAGES.filter(s => s !== app.current_stage).map(s => <option key={s} value={s} className="capitalize">{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

function TerminalCard({ app }) {
  return (
    <div className={`bg-white rounded-lg border ${app.is_blacklisted ? 'border-red-300' : 'border-gray-200'} p-2 text-sm`}>
      <div className="flex items-center gap-1.5">
        <Link to={`/candidates/${app.candidate_id}`} className="font-medium text-gray-900 hover:text-blue-600 text-xs truncate">{app.full_name}</Link>
        {app.is_blacklisted && (
          <span className="shrink-0 inline-flex items-center gap-0.5 px-1 py-0.5 text-[10px] font-semibold bg-red-100 text-red-700 rounded-full">
            <ShieldAlert size={9} /> Blacklisted
          </span>
        )}
      </div>
    </div>
  );
}

function ScreeningQuestionsSection({ vacancyId }) {
  const toast = useToast();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [newQ, setNewQ] = useState('');
  const [newKnockout, setNewKnockout] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [editKnockout, setEditKnockout] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [adding, setAdding] = useState(false);

  const loadQuestions = useCallback(() => {
    api.get(`/vacancies/${vacancyId}/screening-questions`).then(r => setQuestions(r.data.data || [])).catch(() => {});
  }, [vacancyId]);

  const loadAnswers = useCallback(() => {
    api.get(`/vacancies/${vacancyId}/screening-answers`).then(r => setAnswers(r.data.data || [])).catch(() => {});
  }, [vacancyId]);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  const addQuestion = async () => {
    if (!newQ.trim()) return;
    setAdding(true);
    try {
      await api.post(`/vacancies/${vacancyId}/screening-questions`, { question: newQ.trim(), is_knockout: newKnockout });
      toast.success('Question added');
      setNewQ('');
      setNewKnockout(false);
      loadQuestions();
    } catch { toast.error('Failed to add question'); }
    setAdding(false);
  };

  const saveEdit = async (qid) => {
    try {
      const q = questions.find(q => q.id === qid);
      await api.put(`/vacancies/${vacancyId}/screening-questions/${qid}`, { question: editText, is_knockout: editKnockout, sort_order: q?.sort_order ?? 0 });
      toast.success('Question updated');
      setEditingId(null);
      loadQuestions();
    } catch { toast.error('Failed to update'); }
  };

  const deleteQuestion = async (qid) => {
    try {
      await api.delete(`/vacancies/${vacancyId}/screening-questions/${qid}`);
      toast.success('Question deleted');
      setDeleteConfirm(null);
      loadQuestions();
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Screening Questions</h2>
        <button onClick={() => { setShowAnswers(!showAnswers); if (!showAnswers) loadAnswers(); }} className="text-sm text-blue-600 hover:underline">
          {showAnswers ? 'Hide Answers' : 'View Answers'}
        </button>
      </div>

      {/* Add new question */}
      <div className="flex gap-2 mb-4">
        <input
          value={newQ} onChange={e => setNewQ(e.target.value)}
          placeholder="Add a screening question..."
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          onKeyDown={e => e.key === 'Enter' && addQuestion()}
        />
        <label className="flex items-center gap-1.5 text-sm text-gray-600 shrink-0 cursor-pointer select-none">
          <input type="checkbox" checked={newKnockout} onChange={e => setNewKnockout(e.target.checked)} className="rounded border-gray-300 text-red-600 focus:ring-red-500" />
          Knockout
        </label>
        <button onClick={addQuestion} disabled={adding || !newQ.trim()} className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          <Plus size={14} /> Add
        </button>
      </div>

      {/* Question list */}
      {questions.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">No screening questions yet.</p>
      ) : (
        <div className="space-y-2">
          {questions.map((q, idx) => (
            <div key={q.id} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-xs text-gray-400 mt-1 shrink-0 w-5 text-right">{idx + 1}.</span>
              {editingId === q.id ? (
                <div className="flex-1 space-y-2">
                  <input value={editText} onChange={e => setEditText(e.target.value)} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
                      <input type="checkbox" checked={editKnockout} onChange={e => setEditKnockout(e.target.checked)} className="rounded border-gray-300 text-red-600 focus:ring-red-500" />
                      Knockout
                    </label>
                    <button onClick={() => saveEdit(q.id)} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                    <button onClick={() => setEditingId(null)} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-gray-800">{q.question}</p>
                    {q.is_knockout && <span className="inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 bg-red-100 text-red-700 rounded">KNOCKOUT</span>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => { setEditingId(q.id); setEditText(q.question); setEditKnockout(q.is_knockout); }} className="p-1 text-gray-400 hover:text-blue-600 rounded"><Edit size={14} /></button>
                    {deleteConfirm === q.id ? (
                      <span className="flex items-center gap-1 text-xs">
                        <button onClick={() => deleteQuestion(q.id)} className="px-1.5 py-0.5 bg-red-600 text-white rounded text-xs hover:bg-red-700">Yes</button>
                        <button onClick={() => setDeleteConfirm(null)} className="px-1.5 py-0.5 border border-gray-300 rounded text-xs hover:bg-gray-100">No</button>
                      </span>
                    ) : (
                      <button onClick={() => setDeleteConfirm(q.id)} className="p-1 text-gray-400 hover:text-red-600 rounded"><Trash2 size={14} /></button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Answers per candidate */}
      {showAnswers && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Candidate Answers</h3>
          {answers.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-3">No answers submitted yet.</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {answers.map((a, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm">
                  <p className="font-medium text-gray-900">{a.candidate_name || a.full_name || `Candidate #${a.candidate_id}`}</p>
                  {(a.answers || []).map((ans, j) => (
                    <div key={j} className="mt-1.5 text-xs">
                      <p className="text-gray-500">{ans.question}</p>
                      <p className="text-gray-800">{ans.answer || <span className="italic text-gray-400">No answer</span>}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EligibilitySection({ vacancyId }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const check = async () => {
    setLoading(true);
    try {
      const r = await api.get(`/vacancies/${vacancyId}/eligibility`);
      setData(r.data.data || []);
    } catch { toast.error('Failed to check eligibility'); }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Eligibility Check</h2>
        <button onClick={check} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {loading ? (
            <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
          ) : (
            <Shield size={14} />
          )}
          {loading ? 'Checking...' : 'Check Eligibility'}
        </button>
      </div>

      {data === null ? (
        <p className="text-sm text-gray-500 text-center py-4">Click "Check Eligibility" to verify applicant qualifications.</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">No applicants to check.</p>
      ) : (
        <div className="space-y-2">
          {data.map((c, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${c.eligible ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className={`shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold ${c.eligible ? 'bg-green-500' : 'bg-red-500'}`}>
                {c.eligible ? '✓' : '!'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{c.candidate_name || c.full_name || `Candidate #${c.candidate_id}`}</p>
                {c.eligible ? (
                  <p className="text-xs text-green-700 mt-0.5">Eligible</p>
                ) : (
                  <div className="mt-1 space-y-0.5">
                    {(c.flags || []).map((flag, j) => (
                      <p key={j} className="text-xs text-red-700 flex items-center gap-1">
                        <AlertTriangle size={11} className="shrink-0" /> {flag}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CompareSection({ vacancyId }) {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get(`/vacancies/${vacancyId}/compare`);
      setRows(r.data.data || []);
    } catch { toast.error('Failed to load comparison'); }
    setLoading(false);
  };

  const money = (n) => n ? `₹${Number(n).toLocaleString('en-IN')}` : '—';

  const attrs = [
    ['Stage', r => <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${stageColors[r.current_stage] || 'bg-gray-100 text-gray-600'}`}>{r.current_stage.replace(/_/g, ' ')}</span>],
    ['City', r => r.current_city || '—'],
    ['Experience', r => r.is_fresher ? <span className="text-blue-600">Fresher</span> : `${r.total_experience_years} yr`],
    ['Qualifications', r => r.qualifications.length ? r.qualifications.map(q => q.degree).filter(Boolean).join(', ') || '—' : '—'],
    ['Subjects', r => r.subjects.length ? r.subjects.join(', ') : '—'],
    ['Current Salary', r => money(r.current_salary)],
    ['Expected Salary', r => money(r.expected_salary)],
    ['Salary Fit', r => r.salary_fit ? <span className={`text-xs px-2 py-0.5 rounded-full ${fitStyles[r.salary_fit.level]}`}>{r.salary_fit.label}</span> : '—'],
    ['Interview Score', r => r.avg_eval_score != null ? <span className="font-medium">{r.avg_eval_score}/10 <span className="text-xs text-gray-400">({r.eval_count})</span></span> : '—'],
    ['Docs Verified', r => r.verification_total ? `${r.verified_count}/${r.verification_total}` : '—'],
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Compare Applicants</h2>
        <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {loading ? <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" /> : <Users size={14} />}
          {loading ? 'Loading...' : rows ? 'Refresh' : 'Compare Applicants'}
        </button>
      </div>
      {rows === null ? (
        <p className="text-sm text-gray-500 text-center py-4">Click "Compare Applicants" to see all candidates side by side.</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">No applicants to compare.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse min-w-max">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white text-left text-xs font-semibold text-gray-400 uppercase px-3 py-2 border-b border-gray-200">Attribute</th>
                {rows.map(r => (
                  <th key={r.candidate_id} className="text-left px-3 py-2 border-b border-gray-200 min-w-[160px]">
                    <Link to={`/candidates/${r.candidate_id}`} className="font-semibold text-gray-900 hover:text-blue-600">{r.full_name}</Link>
                    {r.is_blacklisted && <span className="ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-red-100 text-red-700 rounded-full"><ShieldAlert size={9} /> BL</span>}
                    <p className="text-xs text-gray-400 font-normal">{r.phone}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attrs.map(([label, render]) => (
                <tr key={label} className="hover:bg-gray-50">
                  <td className="sticky left-0 bg-white text-xs font-medium text-gray-500 px-3 py-2.5 border-b border-gray-100 whitespace-nowrap">{label}</td>
                  {rows.map(r => (
                    <td key={r.candidate_id} className="px-3 py-2.5 border-b border-gray-100 text-gray-800 align-top">{render(r)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const COST_TYPES = [
  { value: 'advertising', label: 'Advertising' },
  { value: 'agency', label: 'Agency Fees' },
  { value: 'travel', label: 'Travel' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'other', label: 'Other' },
];

// Written out in full — Tailwind purges interpolated class names.
const COST_TYPE_STYLES = {
  advertising: 'bg-blue-100 text-blue-700',
  agency: 'bg-violet-100 text-violet-700',
  travel: 'bg-amber-100 text-amber-700',
  assessment: 'bg-cyan-100 text-cyan-700',
  other: 'bg-gray-100 text-gray-600',
};

const inr = n => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// Cost entry for this vacancy. Without it the cost-per-hire report on Reports
// has no data to work with, since nothing else writes recruitment_costs.
function CostsSection({ vacancyId }) {
  const toast = useToast();
  const { user } = useAuth();
  const canEdit = ['super_admin', 'admin', 'hr'].includes(user?.role);
  const canDelete = ['super_admin', 'admin'].includes(user?.role);

  const [costs, setCosts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form, setForm] = useState({
    cost_type: 'advertising', amount: '', description: '', date: new Date().toISOString().slice(0, 10),
  });

  const load = useCallback(() => {
    api.get(`/vacancies/${vacancyId}/costs`).then(r => setCosts(r.data.data || [])).catch(() => {});
    api.get(`/vacancies/${vacancyId}/cost-summary`).then(r => setSummary(r.data.data)).catch(() => {});
  }, [vacancyId]);

  useEffect(() => { load(); }, [load]);

  const addCost = async () => {
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) { toast.error('Enter an amount greater than zero'); return; }
    setSaving(true);
    try {
      await api.post(`/vacancies/${vacancyId}/costs`, { ...form, amount });
      toast.success('Cost added');
      setForm({ cost_type: 'advertising', amount: '', description: '', date: new Date().toISOString().slice(0, 10) });
      setShowForm(false);
      load();
    } catch { toast.error('Failed to add cost'); }
    setSaving(false);
  };

  const removeCost = async (costId) => {
    try {
      await api.delete(`/vacancies/${vacancyId}/costs/${costId}`);
      toast.success('Cost removed');
      setDeleteConfirm(null);
      load();
    } catch { toast.error('Failed to remove cost'); }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2.5">
          <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
            <IndianRupee size={18} />
          </span>
          Recruitment Costs
        </h2>
        {canEdit && (
          <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-1 px-3 py-1.5 text-sm border border-emerald-200 text-emerald-600 rounded-lg hover:bg-emerald-50">
            <Plus size={14} /> {showForm ? 'Cancel' : 'Add Cost'}
          </button>
        )}
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
            <p className="text-xs text-emerald-700/70">Total Spend</p>
            <p className="text-xl font-bold text-emerald-700">{inr(summary.total)}</p>
          </div>
          <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
            <p className="text-xs text-blue-700/70">Candidates Joined</p>
            <p className="text-xl font-bold text-blue-700">{summary.joined_count}</p>
          </div>
          <div className="rounded-lg border border-violet-100 bg-violet-50/50 p-3">
            <p className="text-xs text-violet-700/70">Cost per Hire</p>
            <p className="text-xl font-bold text-violet-700">
              {summary.cost_per_hire == null ? <span className="text-sm font-medium text-violet-400">No hires yet</span> : inr(summary.cost_per_hire)}
            </p>
          </div>
        </div>
      )}

      {showForm && (
        <div className="mb-4 p-4 rounded-lg border border-emerald-100 bg-emerald-50/40 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select value={form.cost_type} onChange={e => setForm({ ...form, cost_type: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
              {COST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Amount (₹)</label>
            <input type="number" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
              placeholder="0" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. Naukri job posting" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
            <button onClick={addCost} disabled={saving}
              className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium">
              {saving ? 'Saving...' : 'Save Cost'}
            </button>
          </div>
        </div>
      )}

      {costs.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">
          No costs recorded yet.{canEdit && ' Add advertising, agency or travel spend to track cost per hire.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-3 font-medium">Type</th>
                <th className="py-2 pr-3 font-medium">Description</th>
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Added By</th>
                <th className="py-2 pr-3 font-medium text-right">Amount</th>
                {canDelete && <th className="py-2 w-20" />}
              </tr>
            </thead>
            <tbody>
              {costs.map(c => (
                <tr key={c.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2.5 pr-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${COST_TYPE_STYLES[c.cost_type] || COST_TYPE_STYLES.other}`}>
                      {COST_TYPES.find(t => t.value === c.cost_type)?.label || c.cost_type}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-gray-700">{c.description || <span className="text-gray-400">—</span>}</td>
                  <td className="py-2.5 pr-3 text-gray-500">{c.date}</td>
                  <td className="py-2.5 pr-3 text-gray-500">{c.created_by_name || '—'}</td>
                  <td className="py-2.5 pr-3 text-right font-medium text-gray-900">{inr(c.amount)}</td>
                  {canDelete && (
                    <td className="py-2.5 text-right">
                      {deleteConfirm === c.id ? (
                        <span className="flex items-center justify-end gap-1">
                          <button onClick={() => removeCost(c.id)} className="px-1.5 py-0.5 bg-red-600 text-white rounded text-xs hover:bg-red-700">Yes</button>
                          <button onClick={() => setDeleteConfirm(null)} className="px-1.5 py-0.5 border border-gray-300 rounded text-xs hover:bg-gray-100">No</button>
                        </span>
                      ) : (
                        <button onClick={() => setDeleteConfirm(c.id)} className="p-1 text-gray-400 hover:text-red-600 rounded"><Trash2 size={14} /></button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function VacancyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [vacancy, setVacancy] = useState(null);
  const [applications, setApplications] = useState([]);
  const [stageModal, setStageModal] = useState(null);
  const [reason, setReason] = useState('');

  // Bulk selection
  const [selected, setSelected] = useState(new Set());
  const [bulkStage, setBulkStage] = useState('');
  const [bulkReason, setBulkReason] = useState('');
  const [bulkMoving, setBulkMoving] = useState(false);
  const [showBulkReason, setShowBulkReason] = useState(false);

  const load = () => {
    api.get(`/vacancies/${id}`).then(r => setVacancy(r.data.data));
    api.get(`/vacancies/${id}/applications`).then(r => setApplications(r.data.data));
  };
  useEffect(load, [id]);

  const [deleteConfirmVacancy, setDeleteConfirmVacancy] = useState(false);

  const clone = async () => {
    const r = await api.post(`/vacancies/${id}/clone`);
    toast.success('Vacancy cloned');
    navigate(`/vacancies/${r.data.data.id}`);
  };

  const handleDeleteVacancy = async () => {
    try {
      await api.delete(`/vacancies/${id}`);
      toast.success('Vacancy deleted');
      navigate('/vacancies');
    } catch { toast.error('Failed to delete vacancy'); }
  };

  const changeStage = async (appId, stage) => {
    await api.put(`/applications/${appId}/stage`, { stage, reason });
    toast.success(`Moved to ${stage.replace(/_/g, ' ')}`);
    setStageModal(null);
    setReason('');
    load();
  };

  const toggleSelect = (appId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(appId)) next.delete(appId); else next.add(appId);
      return next;
    });
  };

  const selectAllInStage = (stage) => {
    const ids = applications.filter(a => a.current_stage === stage).map(a => a.id);
    setSelected(prev => {
      const next = new Set(prev);
      const allSelected = ids.every(id => next.has(id));
      ids.forEach(id => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const bulkMove = async () => {
    if (!bulkStage || selected.size === 0) return;
    setBulkMoving(true);
    try {
      await api.post('/applications/bulk-stage', {
        application_ids: [...selected],
        stage: bulkStage,
        reason: bulkReason,
      });
      toast.success(`${selected.size} candidate${selected.size > 1 ? 's' : ''} moved to ${bulkStage.replace(/_/g, ' ')}`);
      setSelected(new Set());
      setBulkStage('');
      setBulkReason('');
      setShowBulkReason(false);
      load();
    } catch {
      toast.error('Bulk move failed');
    }
    setBulkMoving(false);
  };

  if (!vacancy) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  const grouped = {};
  ALL_STAGES.forEach(s => grouped[s] = applications.filter(a => a.current_stage === s));

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 rounded-2xl p-5 text-white flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate('/vacancies')} className="p-2 rounded-lg bg-white/15 hover:bg-white/25 transition-colors"><ArrowLeft size={20} /></button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{vacancy.title}</h1>
          <p className="text-sm text-white/75">{vacancy.department_name} {vacancy.subject ? `- ${vacancy.subject}` : ''} {vacancy.designation_title ? `| ${vacancy.designation_title}` : ''}</p>
        </div>
        <button onClick={() => { const token = localStorage.getItem('token'); window.open(`/api/export/vacancy-report/${id}?token=${encodeURIComponent(token)}`, '_blank'); }}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-white/15 hover:bg-white/25 transition-colors" title="Download report PDF">
          <Users size={16} /> Report PDF
        </button>
        <Link to={`/vacancies/${id}/edit`} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-white/15 hover:bg-white/25 transition-colors"><Edit size={16} /> Edit</Link>
        <button onClick={clone} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-white/15 hover:bg-white/25 transition-colors"><Copy size={16} /> Clone</button>
        {deleteConfirmVacancy ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg">
            <span className="text-sm text-red-700 font-medium">Delete this vacancy?</span>
            <button onClick={handleDeleteVacancy} className="px-2.5 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700">Yes, Delete</button>
            <button onClick={() => setDeleteConfirmVacancy(false)} className="px-2.5 py-1 border border-gray-300 text-gray-700 text-xs rounded-md hover:bg-gray-100">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setDeleteConfirmVacancy(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-red-500/90 hover:bg-red-500 transition-colors"><Trash2 size={16} /> Delete</button>
        )}
      </div>

      {/* Application Pipeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Application Pipeline</h2>
          {selected.size > 0 && (
            <button onClick={() => setSelected(new Set())} className="text-xs text-gray-500 hover:text-gray-700">Clear selection ({selected.size})</button>
          )}
        </div>
        {applications.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No applications yet. <Link to="/candidates" className="text-blue-600 hover:underline">Add candidates</Link> and apply them to this vacancy.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex gap-3 min-w-max pb-2">
              {STAGES.map(stage => (
                <div key={stage} className="w-52 shrink-0">
                  <div className={`text-xs font-semibold px-2 py-1.5 rounded-t-lg capitalize flex items-center justify-between ${stageColors[stage]}`}>
                    <span>{stage.replace(/_/g, ' ')} ({grouped[stage].length})</span>
                    {grouped[stage].length > 0 && (
                      <button onClick={() => selectAllInStage(stage)} className="opacity-60 hover:opacity-100" title="Select all">
                        {grouped[stage].every(a => selected.has(a.id)) ? <CheckSquare size={12} /> : <Square size={12} />}
                      </button>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-b-lg min-h-[100px] p-2 space-y-2">
                    {grouped[stage].map(app => (
                      <ApplicationCard
                        key={app.id}
                        app={app}
                        selected={selected.has(app.id)}
                        onToggle={toggleSelect}
                        onStageChange={changeStage}
                        setStageModal={setStageModal}
                        vacancy={vacancy}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {TERMINAL.some(s => grouped[s].length > 0) && (
              <div className="mt-4 grid grid-cols-4 gap-3">
                {TERMINAL.map(stage => (
                  <div key={stage}>
                    <div className={`text-xs font-semibold px-2 py-1.5 rounded-t-lg capitalize ${stageColors[stage]}`}>
                      {stage.replace(/_/g, ' ')} ({grouped[stage].length})
                    </div>
                    <div className="bg-gray-50 rounded-b-lg min-h-[60px] p-2 space-y-2">
                      {grouped[stage].map(app => (
                        <TerminalCard key={app.id} app={app} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Compare Applicants */}
      <CompareSection vacancyId={id} />

      {/* Screening Questions */}
      <ScreeningQuestionsSection vacancyId={id} />

      {/* Eligibility Check */}
      <EligibilitySection vacancyId={id} />

      {/* Recruitment Costs */}
      <CostsSection vacancyId={id} />

      {/* Bulk Action Floating Bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white rounded-xl shadow-2xl px-5 py-3 flex items-center gap-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="w-px h-5 bg-gray-600" />
          <select value={bulkStage} onChange={e => setBulkStage(e.target.value)} className="text-sm bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-white">
            <option value="">Move to...</option>
            {ALL_STAGES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
          {bulkStage && ['rejected', 'waitlisted', 'declined'].includes(bulkStage) && !showBulkReason && (
            <button onClick={() => setShowBulkReason(true)} className="text-xs text-gray-400 hover:text-white">+ reason</button>
          )}
          {showBulkReason && (
            <input
              value={bulkReason}
              onChange={e => setBulkReason(e.target.value)}
              placeholder="Reason (optional)"
              className="text-sm bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-white placeholder-gray-500 w-40"
            />
          )}
          <button onClick={bulkMove} disabled={!bulkStage || bulkMoving} className="px-3 py-1.5 text-sm bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
            {bulkMoving ? 'Moving...' : 'Move'}
          </button>
          <button onClick={() => { setSelected(new Set()); setBulkStage(''); setBulkReason(''); setShowBulkReason(false); }} className="p-1 text-gray-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Stage change reason modal */}
      {stageModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-3 capitalize">Move to {stageModal.stage.replace(/_/g, ' ')}</h3>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-4" />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setStageModal(null); setReason(''); }} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={() => changeStage(stageModal.appId, stageModal.stage)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
