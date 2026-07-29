import { useState, useEffect } from 'react';
import api from '../lib/api.js';
import { X } from 'lucide-react';
import { useToast } from './Toast.jsx';

export default function ScheduleInterviewModal({ applicationId, onClose, onDone }) {
  const toast = useToast();
  const [form, setForm] = useState({
    interview_type: 'interview', scheduled_date: '', scheduled_time: '',
    mode: 'in_person', location_or_link: '', demo_topic: '', demo_class: '',
    demo_duration_minutes: '', panel_member_ids: [],
  });
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/settings/users').then(r => setUsers(r.data.data)).catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const togglePanel = (uid) => {
    setForm(f => ({
      ...f,
      panel_member_ids: f.panel_member_ids.includes(uid)
        ? f.panel_member_ids.filter(id => id !== uid)
        : [...f.panel_member_ids, uid]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/interviews', { ...form, application_id: applicationId });
      onDone?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to schedule');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Schedule Interview</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select value={form.interview_type} onChange={e => set('interview_type', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="interview">Interview</option>
                <option value="demo">Demo Class</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
              <select value={form.mode} onChange={e => set('mode', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="in_person">In-person</option>
                <option value="online">Online</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input type="date" value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <input type="time" value={form.scheduled_time} onChange={e => set('scheduled_time', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{form.mode === 'online' ? 'Meeting Link' : 'Location'}</label>
            <input value={form.location_or_link} onChange={e => set('location_or_link', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          {form.interview_type === 'demo' && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                <input value={form.demo_topic} onChange={e => set('demo_topic', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                <input value={form.demo_class} onChange={e => set('demo_class', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
                <input type="number" value={form.demo_duration_minutes} onChange={e => set('demo_duration_minutes', +e.target.value || '')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
          )}

          {users.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Panel Members</label>
              <div className="flex flex-wrap gap-2">
                {users.filter(u => u.is_active).map(u => (
                  <button key={u.id} type="button" onClick={() => togglePanel(u.id)}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${form.panel_member_ids.includes(u.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
                    {u.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">{saving ? 'Scheduling...' : 'Schedule'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
