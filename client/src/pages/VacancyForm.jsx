import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api.js';
import { Save, Briefcase, GraduationCap, Wallet, StickyNote } from 'lucide-react';
import { useToast } from '../components/Toast.jsx';
import { Section, TONES, FormBanner } from '../components/FormSection.jsx';

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

  // Subject belongs to teaching posts only (PRT/TGT/PGT) — an office role has
  // no subject, so the field is hidden and any stale value cleared.
  const isTeaching = !!designations.find(d => String(d.id) === String(form.designation_id))?.is_teaching;

  const setDesignation = (v) => {
    const teaching = !!designations.find(d => String(d.id) === String(v))?.is_teaching;
    setForm(f => ({ ...f, designation_id: v, subject: teaching ? f.subject : '' }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <FormBanner
        gradient="from-violet-600 via-purple-600 to-fuchsia-600"
        title={id ? 'Edit Vacancy' : 'Create Vacancy'}
        subtitle={id ? 'Update this post’s details' : 'Open a new post for candidates to apply to'}
        onBack={() => navigate(-1)}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Section icon={Briefcase} title="Role Details" tone={TONES.violet}>
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
            <select value={form.designation_id || ''} onChange={e => setDesignation(e.target.value || null)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Select...</option>
              {designations.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
          </div>
          {isTeaching && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input value={form.subject || ''} onChange={e => set('subject', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
            <select value={form.academic_year_id || ''} onChange={e => set('academic_year_id', e.target.value || null)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Select...</option>
              {years.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}
            </select>
          </div>
          {id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                {['open', 'interviewing', 'filled', 'closed', 'reopened'].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </div>
          )}
        </div>
        </Section>

        <Section icon={GraduationCap} title="Requirements" tone={TONES.blue}>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Experience (min years)</label>
            <input type="number" value={form.experience_min || 0} onChange={e => set('experience_min', +e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Experience (max years)</label>
            <input type="number" value={form.experience_max || ''} onChange={e => set('experience_max', e.target.value ? +e.target.value : '')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Qualification Required</label>
            <input value={form.qualification_required || ''} onChange={e => set('qualification_required', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>
        </Section>

        <Section icon={Wallet} title="Compensation & Positions" tone={TONES.emerald}>
        <div className="grid md:grid-cols-2 gap-4">
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
        </div>
        </Section>

        <Section icon={StickyNote} title="Description" tone={TONES.rose}>
          <textarea rows={4} value={form.description || ''} onChange={e => set('description', e.target.value)}
            placeholder="What the role involves, who you're looking for..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </Section>

        <div className="flex justify-end gap-3 pb-8">
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-violet-700 hover:to-purple-700 disabled:opacity-60 transition-all shadow-sm">
            <Save size={16} /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
