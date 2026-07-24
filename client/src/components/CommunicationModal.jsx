import { useState } from 'react';
import api from '../lib/api.js';
import { X } from 'lucide-react';

export default function CommunicationModal({ candidateId, applicationId, onClose, onDone }) {
  const [form, setForm] = useState({
    comm_type: 'call', direction: 'outgoing', summary: '', outcome: '', follow_up_date: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/communications', { ...form, candidate_id: candidateId, application_id: applicationId || null });
      onDone?.();
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Log Communication</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={form.comm_type} onChange={e => set('comm_type', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="call">Phone Call</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="in_person">In Person</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
              <select value={form.direction} onChange={e => set('direction', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="outgoing">Outgoing</option>
                <option value="incoming">Incoming</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
            <textarea value={form.summary} onChange={e => set('summary', e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="What was discussed..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Outcome</label>
            <input value={form.outcome} onChange={e => set('outcome', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Will call back tomorrow" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Date</label>
            <input type="date" value={form.follow_up_date} onChange={e => set('follow_up_date', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">{saving ? 'Saving...' : 'Log Communication'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
