import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api.js';
import { ArrowLeft, Save, AlertTriangle, Plus, Trash2, GraduationCap, Briefcase } from 'lucide-react';
import ResumeParser from '../components/ResumeParser.jsx';

const sources = [
  { value: 'walk_in', label: 'Walk-in' }, { value: 'naukri', label: 'Naukri' },
  { value: 'whatsapp', label: 'WhatsApp' }, { value: 'referral', label: 'Referral' },
  { value: 'website', label: 'Website' }, { value: 'direct_call', label: 'Direct Call' },
  { value: 'other', label: 'Other' },
];

const qualLevels = ['10th (Secondary)', '12th (Sr. Secondary)', 'Graduation', 'Post Graduation', 'B.Ed', 'D.El.Ed', 'Diploma', 'Ph.D', 'Other'];

const emptyQual = () => ({ degree: '', specialization: '', university: '', year_of_passing: '', percentage_or_cgpa: '', is_appearing: false });
const emptyExp = () => ({ school_name: '', designation: '', from_date: '', to_date: '', subjects_taught: '', other_roles: '' });

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none';

export default function CandidateForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '', father_or_husband_name: '', gender: '', date_of_birth: '', phone: '', whatsapp_number: '', email: '',
    current_city: '', current_state: '', current_salary: '', expected_salary: '', aadhar_number: '', oasis_id: '',
    is_fresher: false, source: '', referrer_name: '', notes: '',
  });
  const [qualifications, setQualifications] = useState([emptyQual()]);
  const [experience, setExperience] = useState([emptyExp()]);
  const [duplicates, setDuplicates] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) api.get(`/candidates/${id}`).then(r => {
      const c = r.data.data;
      setForm({
        full_name: c.full_name || '', father_or_husband_name: c.father_or_husband_name || '', gender: c.gender || '',
        date_of_birth: c.date_of_birth || '', phone: c.phone || '', whatsapp_number: c.whatsapp_number || '', email: c.email || '',
        current_city: c.current_city || '', current_state: c.current_state || '', current_salary: c.current_salary || '',
        expected_salary: c.expected_salary || '', aadhar_number: c.aadhar_number || '', oasis_id: c.oasis_id || '',
        is_fresher: !!c.is_fresher, source: c.source || '', referrer_name: c.referrer_name || '', notes: c.notes || '',
      });
      if (c.qualifications?.length) setQualifications(c.qualifications.map(q => ({
        degree: q.degree || '', specialization: q.specialization || '', university: q.university || '',
        year_of_passing: q.year_of_passing || '', percentage_or_cgpa: q.percentage_or_cgpa || '', is_appearing: !!q.is_appearing,
      })));
      if (c.experience?.length) setExperience(c.experience.map(e => ({
        school_name: e.school_name || '', designation: e.designation || '', from_date: e.from_date || '',
        to_date: e.to_date || '', subjects_taught: e.subjects_taught || '', other_roles: e.other_roles || '',
      })));
    });
  }, [id]);

  const checkDuplicates = async (phone) => {
    if (!phone || phone.length < 6) return;
    const r = await api.get('/candidates/duplicates-check', { params: { phone } });
    setDuplicates(r.data.data.filter(d => d.id !== +id));
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const setQual = (i, k, v) => setQualifications(qs => qs.map((q, idx) => idx === i ? { ...q, [k]: v } : q));
  const setExp = (i, k, v) => setExperience(es => es.map((e, idx) => idx === i ? { ...e, [k]: v } : e));

  const validate = () => {
    if (!form.full_name.trim()) return 'Full name is required';
    if (form.expected_salary === '' || form.expected_salary == null) return 'Expected salary is required';
    if (!form.is_fresher && (form.current_salary === '' || form.current_salary == null)) return 'Current salary is required (or mark as Fresher)';
    const aadhar = String(form.aadhar_number).replace(/\s/g, '');
    if (!/^\d{12}$/.test(aadhar)) return 'A valid 12-digit Aadhar number is required';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    setError('');
    setSaving(true);

    const cleanQuals = qualifications.filter(q => q.degree || q.university || q.year_of_passing || q.percentage_or_cgpa);
    const cleanExp = form.is_fresher ? [] : experience.filter(e => e.school_name || e.designation || e.subjects_taught);
    const payload = { ...form, qualifications: cleanQuals, experience: cleanExp };

    try {
      if (id) {
        await api.put(`/candidates/${id}`, payload);
        navigate(`/candidates/${id}`);
      } else {
        const r = await api.post('/candidates', { ...payload, force: duplicates.length > 0 });
        if (r.data.data.duplicates) { setDuplicates(r.data.data.duplicates); setSaving(false); return; }
        navigate(`/candidates/${r.data.data.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save candidate');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} /></button>
        <h1 className="text-2xl font-bold text-gray-900">{id ? 'Edit Candidate' : 'Add Candidate'}</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

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

      {!id && (
        <ResumeParser onParsed={({ name, phone, email }) => {
          if (name) set('full_name', name);
          if (phone) set('phone', phone);
          if (email) set('email', email);
        }} />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input value={form.full_name} onChange={e => set('full_name', e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Father's / Husband's Name</label>
              <input value={form.father_or_husband_name} onChange={e => set('father_or_husband_name', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select value={form.gender} onChange={e => set('gender', e.target.value)} className={inputCls}>
                <option value="">Select...</option>
                <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} onBlur={e => checkDuplicates(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
              <input value={form.whatsapp_number} onChange={e => set('whatsapp_number', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Aadhar Number *</label>
              <input value={form.aadhar_number} onChange={e => set('aadhar_number', e.target.value.replace(/[^\d\s]/g, ''))} maxLength={14} placeholder="12-digit number" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Oasis ID</label>
              <input value={form.oasis_id} onChange={e => set('oasis_id', e.target.value)} placeholder="Optional" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current City</label>
              <input value={form.current_city} onChange={e => set('current_city', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current State</label>
              <input value={form.current_state} onChange={e => set('current_state', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <select value={form.source} onChange={e => set('source', e.target.value)} className={inputCls}>
                <option value="">Select...</option>
                {sources.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            {form.source === 'referral' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Referrer Name</label>
                <input value={form.referrer_name} onChange={e => set('referrer_name', e.target.value)} className={inputCls} />
              </div>
            )}
          </div>
        </div>

        {/* Salary */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Salary Details</h2>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.is_fresher} onChange={e => set('is_fresher', e.target.checked)} className="accent-blue-600 w-4 h-4" />
              Fresher (no prior experience)
            </label>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Salary (Monthly) {!form.is_fresher && '*'}
              </label>
              <input type="number" value={form.current_salary} disabled={form.is_fresher}
                onChange={e => set('current_salary', e.target.value)}
                placeholder={form.is_fresher ? 'N/A for freshers' : 'e.g. 25000'}
                className={`${inputCls} ${form.is_fresher ? 'bg-gray-100 text-gray-400' : ''}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Salary (Monthly) *</label>
              <input type="number" value={form.expected_salary} onChange={e => set('expected_salary', e.target.value)} placeholder="e.g. 35000" className={inputCls} />
            </div>
          </div>
        </div>

        {/* Qualifications */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><GraduationCap size={20} className="text-gray-400" /> Qualifications</h2>
            <button type="button" onClick={() => setQualifications(q => [...q, emptyQual()])}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">
              <Plus size={15} /> Add Qualification
            </button>
          </div>
          <div className="space-y-4">
            {qualifications.map((q, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-4 bg-gray-50/50 relative">
                {qualifications.length > 1 && (
                  <button type="button" onClick={() => setQualifications(qs => qs.filter((_, idx) => idx !== i))}
                    className="absolute top-3 right-3 p-1 text-gray-300 hover:text-red-500" title="Remove">
                    <Trash2 size={15} />
                  </button>
                )}
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Level / Degree</label>
                    <input list={`qual-levels-${i}`} value={q.degree} onChange={e => setQual(i, 'degree', e.target.value)}
                      placeholder="e.g. 10th, Graduation" className={inputCls} />
                    <datalist id={`qual-levels-${i}`}>
                      {qualLevels.map(l => <option key={l} value={l} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Stream / Specialization</label>
                    <input value={q.specialization} onChange={e => setQual(i, 'specialization', e.target.value)} placeholder="e.g. Science, B.A. English" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Board / University</label>
                    <input value={q.university} onChange={e => setQual(i, 'university', e.target.value)} placeholder="e.g. CBSE, Delhi University" className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Passing Year</label>
                      <input value={q.is_appearing ? '' : q.year_of_passing} disabled={q.is_appearing}
                        onChange={e => setQual(i, 'year_of_passing', e.target.value.replace(/[^\d]/g, ''))} maxLength={4}
                        placeholder={q.is_appearing ? 'Appearing' : 'e.g. 2019'}
                        className={`${inputCls} ${q.is_appearing ? 'bg-gray-100 text-gray-400' : ''}`} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Percentage / CGPA</label>
                      <input value={q.percentage_or_cgpa} onChange={e => setQual(i, 'percentage_or_cgpa', e.target.value)} placeholder="e.g. 78%" className={inputCls} />
                    </div>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer mt-3">
                  <input type="checkbox" checked={q.is_appearing} onChange={e => setQual(i, 'is_appearing', e.target.checked)} className="accent-blue-600 w-4 h-4" />
                  Currently appearing / result awaited
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Experience */}
        {!form.is_fresher && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Briefcase size={20} className="text-gray-400" /> Teaching / Work Experience</h2>
              <button type="button" onClick={() => setExperience(x => [...x, emptyExp()])}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">
                <Plus size={15} /> Add Experience
              </button>
            </div>
            <div className="space-y-4">
              {experience.map((exp, i) => (
                <div key={i} className="border border-gray-100 rounded-lg p-4 bg-gray-50/50 relative">
                  {experience.length > 1 && (
                    <button type="button" onClick={() => setExperience(es => es.filter((_, idx) => idx !== i))}
                      className="absolute top-3 right-3 p-1 text-gray-300 hover:text-red-500" title="Remove">
                      <Trash2 size={15} />
                    </button>
                  )}
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Institution / School Name</label>
                      <input value={exp.school_name} onChange={e => setExp(i, 'school_name', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Designation</label>
                      <input value={exp.designation} onChange={e => setExp(i, 'designation', e.target.value)} placeholder="e.g. PRT, TGT Maths" className={inputCls} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
                        <input type="date" value={exp.from_date} onChange={e => setExp(i, 'from_date', e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
                        <input type="date" value={exp.to_date} onChange={e => setExp(i, 'to_date', e.target.value)} className={inputCls} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Subjects Taught</label>
                      <input value={exp.subjects_taught} onChange={e => setExp(i, 'subjects_taught', e.target.value)} placeholder="e.g. Maths, Science" className={inputCls} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Other Roles / Responsibilities</label>
                      <input value={exp.other_roles} onChange={e => setExp(i, 'other_roles', e.target.value)} placeholder="e.g. Class teacher, Exam coordinator" className={inputCls} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} className={inputCls} />
        </div>

        <div className="flex justify-end gap-3 pb-8">
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
            <Save size={16} /> {saving ? 'Saving...' : 'Save Candidate'}
          </button>
        </div>
      </form>
    </div>
  );
}
