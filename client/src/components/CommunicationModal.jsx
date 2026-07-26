import { useState, useEffect } from 'react';
import api from '../lib/api.js';
import { X, Send, Mail } from 'lucide-react';

export default function CommunicationModal({ candidateId, applicationId, onClose, onDone }) {
  const [form, setForm] = useState({
    comm_type: 'call', direction: 'outgoing', summary: '', outcome: '', follow_up_date: '',
    email_subject: '', email_body: '',
  });
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEmail = form.comm_type === 'email' && form.direction === 'outgoing';

  useEffect(() => {
    if (isEmail && !templates.length) {
      api.get('/settings/email-templates').then(r => setTemplates(r.data?.data || [])).catch(() => {});
    }
  }, [isEmail]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleTemplateSelect = (templateId) => {
    setSelectedTemplate(templateId);
    if (templateId) {
      const t = templates.find(t => t.id === +templateId);
      if (t) {
        set('email_subject', t.subject);
        set('email_body', t.body);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { ...form, candidate_id: candidateId, application_id: applicationId || null };
      if (selectedTemplate) payload.template_id = +selectedTemplate;
      await api.post('/communications', payload);
      onDone?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEmail ? 'Send Email' : 'Log Communication'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
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

          {isEmail && (
            <>
              {templates.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                  <select value={selectedTemplate} onChange={e => handleTemplateSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="">Write custom email</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input value={form.email_subject} onChange={e => set('email_subject', e.target.value)} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Email subject..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
                <textarea value={form.email_body} onChange={e => set('email_body', e.target.value)} required rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Email body... Use {{candidate_name}}, {{school_name}} as variables" />
              </div>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Mail size={12} /> Email will be sent to the candidate's email address
              </p>
            </>
          )}

          {!isEmail && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
              <textarea value={form.summary} onChange={e => set('summary', e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="What was discussed..." />
            </div>
          )}

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
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 flex items-center gap-1.5">
              {isEmail && <Send size={14} />}
              {saving ? (isEmail ? 'Sending...' : 'Saving...') : (isEmail ? 'Send Email' : 'Log Communication')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
