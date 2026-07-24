import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api.js';
import { ArrowLeft, Save } from 'lucide-react';
import { useToast } from '../components/Toast.jsx';

export default function VacancyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ title: '', department_id: '', designation_id: '', subject: '', qualification_required: '', experience_min: 0, experience_max: '', salary_range_min: '', salary_range_max: '', positions_count: 1, academic_year_id: '', description: '', status: 'open' });
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [years, setYears] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/settings/departments').then(r => setDepartments(r.data.data));
    api.get('/settings/designations').then(r => setDesignations(r.data.data));
    api.get('/settings/academic-years').then(r => setYears(r.data.data));
    if (id) api.get(`/vacancies/${id}`).then(r => setForm(r.data.data));
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (id) { await api.put(`/vacancies/${id}`, form); toast.success('Vacancy updated'); }
      else { const r = await api.post('/vacancies', form); toast.success('Vacancy created'); navigate(`/vacancies/${r.data.data.id}`); return; }
      navigate(`/vacancies/${id}`);
    } finally { setSaving(false); }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} /></button>
        <h1 className="text-2xl font-bold text-gray-900">{id ? 'Edit Vacancy' : 'Create Vacancy'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Post Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select value={form.department_id || ''} onChange={e => set('department_id', e.target.value || null)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Select...</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
            <select value={form.designation_id || ''} onChange={e => set('designation_id', e.target.value || null)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Select...</option>
              {designations.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input value={form.subject || ''} onChange={e => set('subject', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
            <select value={form.academic_year_id || ''} onChange={e => set('academic_year_id', e.target.value || null)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Select...</option>
              {years.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Experience (min years)</label>
            <input type="number" value={form.experience_min || 0} onChange={e => set('experience_min', +e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Experience (max years)</label>
            <input type="number" value={form.experience_max || ''} onChange={e => set('experience_max', e.target.value ? +e.target.value : '')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Salary Range (min)</label>
            <input type="number" value={form.salary_range_min || ''} onChange={e => set('salary_range_min', e.target.value ? +e.target.value : '')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Salary Range (max)</label>
            <input type="number" value={form.salary_range_max || ''} onChange={e => set('salary_range_max', e.target.value ? +e.target.value : '')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Positions</label>
            <input type="number" min="1" value={form.positions_count || 1} onChange={e => set('positions_count', +e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Qualification Required</label>
            <input value={form.qualification_required || ''} onChange={e => set('qualification_required', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          {id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                {['open', 'interviewing', 'filled', 'closed', 'reopened'].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </div>
          )}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea rows={3} value={form.description || ''} onChange={e => set('description', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
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
