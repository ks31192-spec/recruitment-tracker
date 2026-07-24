import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../lib/api.js';
import { ArrowLeft, Edit, Copy, Users, ChevronRight } from 'lucide-react';
import { useToast } from '../components/Toast.jsx';

const STAGES = ['applied', 'shortlisted', 'interview_scheduled', 'interview_done', 'demo_scheduled', 'demo_done', 'selected', 'offer_made', 'joined'];
const TERMINAL = ['rejected', 'waitlisted', 'declined', 'no_response'];
const ALL_STAGES = [...STAGES, ...TERMINAL];

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

export default function VacancyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [vacancy, setVacancy] = useState(null);
  const [applications, setApplications] = useState([]);
  const [stageModal, setStageModal] = useState(null);
  const [reason, setReason] = useState('');

  const load = () => {
    api.get(`/vacancies/${id}`).then(r => setVacancy(r.data.data));
    api.get(`/vacancies/${id}/applications`).then(r => setApplications(r.data.data));
  };
  useEffect(load, [id]);

  const clone = async () => {
    const r = await api.post(`/vacancies/${id}/clone`);
    toast.success('Vacancy cloned');
    navigate(`/vacancies/${r.data.data.id}`);
  };

  const changeStage = async (appId, stage) => {
    await api.put(`/applications/${appId}/stage`, { stage, reason });
    toast.success(`Moved to ${stage.replace(/_/g, ' ')}`);
    setStageModal(null);
    setReason('');
    load();
  };

  if (!vacancy) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  const grouped = {};
  ALL_STAGES.forEach(s => grouped[s] = applications.filter(a => a.current_stage === s));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/vacancies')} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{vacancy.title}</h1>
          <p className="text-sm text-gray-500">{vacancy.department_name} {vacancy.subject ? `- ${vacancy.subject}` : ''} {vacancy.designation_title ? `| ${vacancy.designation_title}` : ''}</p>
        </div>
        <Link to={`/vacancies/${id}/edit`} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"><Edit size={16} /> Edit</Link>
        <button onClick={clone} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"><Copy size={16} /> Clone</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Application Pipeline</h2>
        {applications.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No applications yet. <Link to="/candidates" className="text-blue-600 hover:underline">Add candidates</Link> and apply them to this vacancy.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex gap-3 min-w-max pb-2">
              {STAGES.map(stage => (
                <div key={stage} className="w-52 shrink-0">
                  <div className={`text-xs font-semibold px-2 py-1.5 rounded-t-lg capitalize ${stageColors[stage]}`}>
                    {stage.replace(/_/g, ' ')} ({grouped[stage].length})
                  </div>
                  <div className="bg-gray-50 rounded-b-lg min-h-[100px] p-2 space-y-2">
                    {grouped[stage].map(app => (
                      <div key={app.id} className="bg-white rounded-lg border border-gray-200 p-3 text-sm">
                        <Link to={`/candidates/${app.candidate_id}`} className="font-medium text-gray-900 hover:text-blue-600">{app.full_name}</Link>
                        <p className="text-xs text-gray-500 mt-0.5">{app.phone}</p>
                        <div className="mt-2">
                          <select value="" onChange={e => {
                            const val = e.target.value;
                            if (['rejected', 'waitlisted', 'declined'].includes(val)) { setStageModal({ appId: app.id, stage: val }); }
                            else if (val) changeStage(app.id, val);
                          }} className="w-full text-xs border border-gray-200 rounded px-1.5 py-1 text-gray-600">
                            <option value="">Move to...</option>
                            {ALL_STAGES.filter(s => s !== app.current_stage).map(s => <option key={s} value={s} className="capitalize">{s.replace(/_/g, ' ')}</option>)}
                          </select>
                        </div>
                      </div>
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
                        <div key={app.id} className="bg-white rounded-lg border border-gray-200 p-2 text-sm">
                          <Link to={`/candidates/${app.candidate_id}`} className="font-medium text-gray-900 hover:text-blue-600 text-xs">{app.full_name}</Link>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

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
