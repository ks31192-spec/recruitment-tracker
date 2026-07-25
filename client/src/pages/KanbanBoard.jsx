import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';
import { useToast } from '../components/Toast.jsx';
import { Columns3, ChevronDown, ChevronRight, GripVertical, X, User, Phone, Tag } from 'lucide-react';

const PIPELINE_STAGES = [
  { key: 'applied', label: 'Applied', color: 'bg-gray-100 text-gray-700' },
  { key: 'shortlisted', label: 'Shortlisted', color: 'bg-blue-100 text-blue-700' },
  { key: 'interview_scheduled', label: 'Interview', color: 'bg-indigo-100 text-indigo-700' },
  { key: 'interview_done', label: 'Interviewed', color: 'bg-purple-100 text-purple-700' },
  { key: 'demo_scheduled', label: 'Demo', color: 'bg-amber-100 text-amber-700' },
  { key: 'demo_done', label: 'Demo Done', color: 'bg-orange-100 text-orange-700' },
  { key: 'selected', label: 'Selected', color: 'bg-teal-100 text-teal-700' },
  { key: 'offer_made', label: 'Offered', color: 'bg-cyan-100 text-cyan-700' },
  { key: 'joined', label: 'Joined', color: 'bg-green-100 text-green-700' },
];

const TERMINAL_STAGES = [
  { key: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700' },
  { key: 'waitlisted', label: 'Waitlisted', color: 'bg-yellow-100 text-yellow-700' },
  { key: 'declined', label: 'Declined', color: 'bg-pink-100 text-pink-700' },
  { key: 'no_response', label: 'No Response', color: 'bg-gray-100 text-gray-500' },
];

const REASON_REQUIRED_STAGES = ['rejected', 'waitlisted', 'declined'];

const SOURCE_COLORS = {
  walk_in: 'bg-green-50 text-green-700',
  naukri: 'bg-blue-50 text-blue-700',
  whatsapp: 'bg-emerald-50 text-emerald-700',
  referral: 'bg-purple-50 text-purple-700',
  website: 'bg-cyan-50 text-cyan-700',
  direct_call: 'bg-amber-50 text-amber-700',
  other: 'bg-gray-50 text-gray-600',
};

const SOURCE_LABELS = {
  walk_in: 'Walk-in', naukri: 'Naukri', whatsapp: 'WhatsApp',
  referral: 'Referral', website: 'Website', direct_call: 'Direct Call', other: 'Other',
};

function KanbanCard({ app, onDragStart }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', String(app.id));
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(app);
      }}
      className="bg-white rounded-lg border border-gray-200 p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow"
    >
      <Link to={`/candidates/${app.candidate_id}`} className="font-medium text-sm text-gray-900 hover:text-blue-600">
        {app.full_name}
      </Link>
      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
        <Phone size={10} />
        {app.phone || 'No phone'}
      </p>
      {app.source && (
        <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full mt-1.5 font-medium ${SOURCE_COLORS[app.source] || SOURCE_COLORS.other}`}>
          {SOURCE_LABELS[app.source] || app.source}
        </span>
      )}
      {app.tags && (
        <div className="flex gap-1 mt-1.5 flex-wrap">
          {app.tags.split(',').map(t => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full">{t.trim()}</span>
          ))}
        </div>
      )}
      {app.is_blacklisted && (
        <span className="inline-block text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full mt-1.5 font-medium">Blacklisted</span>
      )}
    </div>
  );
}

function ReasonModal({ stage, onSubmit, onCancel }) {
  const [reason, setReason] = useState('');
  const [waitlistExpiry, setWaitlistExpiry] = useState('');

  const stageLabel = [...PIPELINE_STAGES, ...TERMINAL_STAGES].find(s => s.key === stage)?.label || stage;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Move to {stageLabel}</h3>
          <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={`Why is this candidate being ${stageLabel.toLowerCase()}?`}
              autoFocus
            />
          </div>
          {stage === 'waitlisted' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Waitlist Expiry Date</label>
              <input
                type="date"
                value={waitlistExpiry}
                onChange={e => setWaitlistExpiry(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onSubmit(reason, waitlistExpiry)}
            disabled={!reason.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({ stage, apps, onDrop, onDragStart, dragOverStage, setDragOverStage }) {
  const count = apps.length;

  return (
    <div
      className={`flex-shrink-0 w-64 flex flex-col bg-gray-50 rounded-xl border transition-colors ${
        dragOverStage === stage.key ? 'border-blue-400 bg-blue-50/50' : 'border-gray-200'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverStage(stage.key);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setDragOverStage(null);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOverStage(null);
        const appId = e.dataTransfer.getData('text/plain');
        if (appId) onDrop(+appId, stage.key);
      }}
    >
      <div className="p-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stage.color}`}>{stage.label}</span>
        </div>
        <span className="text-xs font-medium text-gray-500 bg-white px-1.5 py-0.5 rounded-full border border-gray-200">{count}</span>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[100px] max-h-[calc(100vh-280px)]">
        {apps.map(app => (
          <KanbanCard key={app.id} app={app} onDragStart={onDragStart} />
        ))}
        {apps.length === 0 && (
          <div className="text-xs text-gray-400 text-center py-8">Drop here</div>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard() {
  const toast = useToast();
  const [vacancies, setVacancies] = useState([]);
  const [selectedVacancy, setSelectedVacancy] = useState('');
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const [reasonModal, setReasonModal] = useState(null); // { appId, stage }
  const [terminalCollapsed, setTerminalCollapsed] = useState(true);

  useEffect(() => {
    api.get('/vacancies?status=open').then(r => setVacancies(r.data.data)).catch(() => {});
  }, []);

  const loadApplications = useCallback(async (vacancyId) => {
    if (!vacancyId) { setApplications([]); return; }
    setLoading(true);
    try {
      const r = await api.get(`/vacancies/${vacancyId}/applications`);
      setApplications(r.data.data);
    } catch {
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (selectedVacancy) loadApplications(selectedVacancy);
  }, [selectedVacancy, loadApplications]);

  const handleDrop = useCallback((appId, newStage) => {
    const app = applications.find(a => a.id === appId);
    if (!app || app.current_stage === newStage) return;

    if (REASON_REQUIRED_STAGES.includes(newStage)) {
      setReasonModal({ appId, stage: newStage });
      return;
    }

    performStageChange(appId, newStage);
  }, [applications]);

  const performStageChange = async (appId, stage, reason, waitlistExpiry) => {
    try {
      const body = { stage };
      if (reason) body.reason = reason;
      if (waitlistExpiry) body.waitlist_expiry_date = waitlistExpiry;
      await api.put(`/applications/${appId}/stage`, body);
      toast.success(`Moved to ${[...PIPELINE_STAGES, ...TERMINAL_STAGES].find(s => s.key === stage)?.label || stage}`);
      loadApplications(selectedVacancy);
    } catch {
      toast.error('Failed to update stage');
    }
  };

  const handleReasonSubmit = (reason, waitlistExpiry) => {
    if (reasonModal) {
      performStageChange(reasonModal.appId, reasonModal.stage, reason, waitlistExpiry);
      setReasonModal(null);
    }
  };

  const appsByStage = (stageKey) => applications.filter(a => a.current_stage === stageKey);

  const terminalApps = TERMINAL_STAGES.map(s => ({
    ...s,
    apps: appsByStage(s.key),
  }));
  const totalTerminal = terminalApps.reduce((sum, s) => sum + s.apps.length, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Columns3 className="text-blue-600" size={24} />
          <h1 className="text-2xl font-bold text-gray-900">Kanban Board</h1>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedVacancy}
            onChange={e => setSelectedVacancy(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[250px]"
          >
            <option value="">Select a vacancy...</option>
            {vacancies.map(v => (
              <option key={v.id} value={v.id}>{v.title} ({v.department_name || 'No Dept'})</option>
            ))}
          </select>
        </div>
      </div>

      {!selectedVacancy && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Columns3 size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">Select a vacancy above to view its recruitment pipeline</p>
        </div>
      )}

      {selectedVacancy && loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {selectedVacancy && !loading && (
        <>
          {/* Pipeline Columns */}
          <div className="flex gap-3 overflow-x-auto pb-4">
            {PIPELINE_STAGES.map(stage => (
              <KanbanColumn
                key={stage.key}
                stage={stage}
                apps={appsByStage(stage.key)}
                onDrop={handleDrop}
                onDragStart={setDraggedItem}
                dragOverStage={dragOverStage}
                setDragOverStage={setDragOverStage}
              />
            ))}
          </div>

          {/* Terminal Stages (collapsed row) */}
          <div className="bg-white rounded-xl border border-gray-200">
            <button
              onClick={() => setTerminalCollapsed(!terminalCollapsed)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {terminalCollapsed ? <ChevronRight size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                <span className="text-sm font-medium text-gray-700">Terminal Stages</span>
                {totalTerminal > 0 && (
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{totalTerminal}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {TERMINAL_STAGES.map(s => {
                  const count = appsByStage(s.key).length;
                  if (!count) return null;
                  return (
                    <span key={s.key} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${s.color}`}>
                      {s.label}: {count}
                    </span>
                  );
                })}
              </div>
            </button>

            {!terminalCollapsed && (
              <div className="flex gap-3 p-4 border-t border-gray-100 overflow-x-auto">
                {TERMINAL_STAGES.map(stage => (
                  <KanbanColumn
                    key={stage.key}
                    stage={stage}
                    apps={appsByStage(stage.key)}
                    onDrop={handleDrop}
                    onDragStart={setDraggedItem}
                    dragOverStage={dragOverStage}
                    setDragOverStage={setDragOverStage}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Reason Modal */}
      {reasonModal && (
        <ReasonModal
          stage={reasonModal.stage}
          onSubmit={handleReasonSubmit}
          onCancel={() => setReasonModal(null)}
        />
      )}
    </div>
  );
}
