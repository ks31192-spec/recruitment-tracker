import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api.js';
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react';

const sources = [
  { value: 'walk_in', label: 'Walk-in' }, { value: 'naukri', label: 'Naukri' },
  { value: 'whatsapp', label: 'WhatsApp' }, { value: 'referral', label: 'Referral' },
  { value: 'website', label: 'Website' }, { value: 'direct_call', label: 'Direct Call' },
  { value: 'other', label: 'Other' },
];

export default function CandidateForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', father_or_husband_name: '', gender: '', date_of_birth: '', phone: '', whatsapp_number: '', email: '', current_city: '', current_state: '', source: '', referrer_name: '', notes: '' });
  const [duplicates, setDuplicates] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) api.get(`/candidates/${id}`).then(r => setForm(r.data.data));
  }, [id]);

  const checkDuplicates = async (phone) => {
    if (!phone || phone.length < 6) return;
    const r = await api.get('/candidates/duplicates-check', { params: { phone } });
    setDuplicates(r.data.data.filter(d => d.id !== +id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (id) { await api.put(`/candidates/${id}`, form); navigate(`/candidates/${id}`); }
      else {
        const r = await api.post('/candidates', { ...form, force: duplicates.length > 0 });
        if (r.data.data.duplicates) { setDuplicates(r.data.data.duplicates); return; }
        navigate(`/candidates/${r.data.data.id}`);
      }
    } finally { setSaving(false); }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} /></button>
        <h1 className="text-2xl font-bold text-gray-900">{id ? 'Edit Candidate' : 'Add Candidate'}</h1>
      </div>

      {duplicates.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle size={18} className="text-amber-600" /><h3 className="font-semibold text-amber-800">Possible Duplicates Found</h3></div>
          <div className="space-y-2">
            {duplicates.map(d => (
              <div key={d.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-100">
                <span className="text-sm"><span className="font-medium">{d.full_name}</span> — {d.phone}</span>
                <button onClick={() => navigate(`/candidates/${d.id}`)} className="text-sm text-blue-600 hover:underline">View Profile</button>
              </div>
            ))}
          </div>
          <p className="text-sm text-amber-700 mt-2">Click Save again to create anyway, or view existing profiles above.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input value={form.full_name} onChange={e => set('full_name', e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Father's / Husband's Name</label>
            <input value={form.father_or_husband_name || ''} onChange={e => set('father_or_husband_name', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select value={form.gender || ''} onChange={e => set('gender', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Select...</option>
              <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
            <input type="date" value={form.date_of_birth || ''} onChange={e => set('date_of_birth', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input value={form.phone || ''} onChange={e => set('phone', e.target.value)} onBlur={e => checkDuplicates(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
            <input value={form.whatsapp_number || ''} onChange={e => set('whatsapp_number', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
            <select value={form.source || ''} onChange={e => set('source', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Select...</option>
              {sources.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current City</label>
            <input value={form.current_city || ''} onChange={e => set('current_city', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current State</label>
            <input value={form.current_state || ''} onChange={e => set('current_state', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          {form.source === 'referral' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Referrer Name</label>
              <input value={form.referrer_name || ''} onChange={e => set('referrer_name', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          )}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea rows={3} value={form.notes || ''} onChange={e => set('notes', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
            <Save size={16} /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
