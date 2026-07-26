import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Send, CheckCircle, Briefcase, MapPin, GraduationCap, Plus, Trash2 } from 'lucide-react';
import { useBranding } from '../context/BrandingContext.jsx';
import SchoolLogo from '../components/SchoolLogo.jsx';

const qualLevels = ['10th (Secondary)', '12th (Sr. Secondary)', 'Graduation', 'Post Graduation', 'B.Ed', 'D.El.Ed', 'Diploma', 'Ph.D', 'Other'];
const emptyQual = () => ({ degree: '', specialization: '', university: '', year_of_passing: '', percentage_or_cgpa: '', is_appearing: false });
const emptyExp = () => ({ school_name: '', designation: '', from_date: '', to_date: '', subjects_taught: '', other_roles: '' });
const fieldCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none';

export default function PublicApply() {
  const { vacancyId } = useParams();
  const { schoolName } = useBranding();
  const [vacancy, setVacancy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    full_name: '', father_or_husband_name: '', gender: '', date_of_birth: '',
    phone: '', whatsapp_number: '', email: '', current_city: '', current_state: '',
    current_salary: '', expected_salary: '', aadhar_number: '', oasis_id: '', is_fresher: false,
    earliest_join_date: '',
  });
  const [qualifications, setQualifications] = useState([emptyQual()]);
  const [experience, setExperience] = useState([emptyExp()]);
  const [screeningAnswers, setScreeningAnswers] = useState({});
  const [resume, setResume] = useState(null);

  const setQual = (i, k, v) => setQualifications(qs => qs.map((q, idx) => idx === i ? { ...q, [k]: v } : q));
  const setExp = (i, k, v) => setExperience(es => es.map((e, idx) => idx === i ? { ...e, [k]: v } : e));

  useEffect(() => {
    axios.get(`/api/public/careers/${vacancyId}`)
      .then(r => setVacancy(r.data.data))
      .catch(() => setError('This position is no longer accepting applications.'))
      .finally(() => setLoading(false));
  }, [vacancyId]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate mandatory fields
    if (form.expected_salary === '' || form.expected_salary == null) { setError('Expected salary is required'); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (!form.is_fresher && (form.current_salary === '' || form.current_salary == null)) { setError('Current salary is required (or tick "I am a fresher")'); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (!/^\d{12}$/.test(String(form.aadhar_number).replace(/\s/g, ''))) { setError('A valid 12-digit Aadhar number is required'); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }

    setSubmitting(true);
    setError('');

    const formData = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v !== '' && v != null) formData.append(k, v); });

    const cleanQuals = qualifications.filter(q => q.degree || q.university || q.year_of_passing || q.percentage_or_cgpa);
    const cleanExp = form.is_fresher ? [] : experience.filter(x => x.school_name || x.designation || x.subjects_taught);
    if (cleanQuals.length) formData.append('qualifications', JSON.stringify(cleanQuals));
    if (cleanExp.length) formData.append('experience', JSON.stringify(cleanExp));

    if (resume) formData.append('resume', resume);
    if (vacancy.screening_questions?.length) {
      const answers = vacancy.screening_questions.map(q => ({
        question_id: q.id,
        answer: screeningAnswers[q.id] || '',
      }));
      formData.append('screening_answers', JSON.stringify(answers));
    }

    try {
      await axios.post(`/api/public/apply/${vacancyId}`, formData);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <CheckCircle className="mx-auto text-green-500 mb-4" size={56} />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
        <p className="text-gray-600 mb-6">Thank you for applying to <strong>{vacancy?.title}</strong>. We will review your application and get back to you soon.</p>
        <Link to="/careers" className="text-blue-600 hover:underline text-sm">View More Openings</Link>
      </div>
    </div>
  );

  if (!vacancy) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Position Not Available</h2>
        <p className="text-gray-600 mb-4">{error || 'This position is no longer accepting applications.'}</p>
        <Link to="/careers" className="text-blue-600 hover:underline text-sm">View Open Positions</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/careers" className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} /></Link>
          <SchoolLogo size={36} rounded="rounded-lg" />
          <div>
            <h1 className="text-lg font-bold text-blue-700">{schoolName}</h1>
            <p className="text-xs text-gray-500">Job Application</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900">{vacancy.title}</h2>
          <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
            {vacancy.department_name && <span className="flex items-center gap-1"><MapPin size={14} />{vacancy.department_name}</span>}
            {vacancy.designation_title && <span className="flex items-center gap-1"><Briefcase size={14} />{vacancy.designation_title}</span>}
            {vacancy.qualification_required && <span className="flex items-center gap-1"><GraduationCap size={14} />{vacancy.qualification_required}</span>}
          </div>
          {vacancy.description && <p className="text-sm text-gray-600 mt-3">{vacancy.description}</p>}
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
          <h3 className="text-lg font-semibold text-gray-900">Your Details</h3>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input value={form.full_name} onChange={e => set('full_name', e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Father's / Husband's Name</label>
              <input value={form.father_or_husband_name} onChange={e => set('father_or_husband_name', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
              <input value={form.whatsapp_number} onChange={e => set('whatsapp_number', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select value={form.gender} onChange={e => set('gender', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">Select...</option>
                <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current City</label>
              <input value={form.current_city} onChange={e => set('current_city', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current State</label>
              <input value={form.current_state} onChange={e => set('current_state', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Aadhar Number *</label>
              <input value={form.aadhar_number} onChange={e => set('aadhar_number', e.target.value.replace(/[^\d\s]/g, ''))} maxLength={14} placeholder="12-digit number" className={fieldCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Oasis ID</label>
              <input value={form.oasis_id} onChange={e => set('oasis_id', e.target.value)} placeholder="Optional" className={fieldCls} />
            </div>
          </div>

          {/* Salary */}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">Salary Expectation</h3>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.is_fresher} onChange={e => set('is_fresher', e.target.checked)} className="accent-blue-600 w-4 h-4" />
                I am a fresher
              </label>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Salary (Monthly) {!form.is_fresher && '*'}</label>
                <input type="number" value={form.current_salary} disabled={form.is_fresher} onChange={e => set('current_salary', e.target.value)}
                  placeholder={form.is_fresher ? 'N/A' : 'e.g. 25000'} className={`${fieldCls} ${form.is_fresher ? 'bg-gray-100 text-gray-400' : ''}`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected Salary (Monthly) *</label>
                <input type="number" value={form.expected_salary} onChange={e => set('expected_salary', e.target.value)} placeholder="e.g. 35000" className={fieldCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Earliest Joining Date</label>
                <input type="date" value={form.earliest_join_date} onChange={e => set('earliest_join_date', e.target.value)} className={fieldCls} />
              </div>
            </div>
          </div>

          {/* Qualifications */}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2"><GraduationCap size={18} className="text-gray-400" /> Qualifications</h3>
              <button type="button" onClick={() => setQualifications(q => [...q, emptyQual()])} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">
                <Plus size={15} /> Add
              </button>
            </div>
            <div className="space-y-4">
              {qualifications.map((q, i) => (
                <div key={i} className="border border-gray-100 rounded-lg p-4 bg-gray-50/50 relative">
                  {qualifications.length > 1 && (
                    <button type="button" onClick={() => setQualifications(qs => qs.filter((_, idx) => idx !== i))} className="absolute top-3 right-3 p-1 text-gray-300 hover:text-red-500"><Trash2 size={15} /></button>
                  )}
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Level / Degree</label>
                      <input list={`ql-${i}`} value={q.degree} onChange={e => setQual(i, 'degree', e.target.value)} placeholder="e.g. 10th, Graduation" className={fieldCls} />
                      <datalist id={`ql-${i}`}>{qualLevels.map(l => <option key={l} value={l} />)}</datalist>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Stream / Specialization</label>
                      <input value={q.specialization} onChange={e => setQual(i, 'specialization', e.target.value)} placeholder="e.g. Science" className={fieldCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Board / University</label>
                      <input value={q.university} onChange={e => setQual(i, 'university', e.target.value)} placeholder="e.g. CBSE" className={fieldCls} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Passing Year</label>
                        <input value={q.is_appearing ? '' : q.year_of_passing} disabled={q.is_appearing} onChange={e => setQual(i, 'year_of_passing', e.target.value.replace(/[^\d]/g, ''))} maxLength={4}
                          placeholder={q.is_appearing ? 'Appearing' : 'e.g. 2019'} className={`${fieldCls} ${q.is_appearing ? 'bg-gray-100 text-gray-400' : ''}`} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Percentage / CGPA</label>
                        <input value={q.percentage_or_cgpa} onChange={e => setQual(i, 'percentage_or_cgpa', e.target.value)} placeholder="e.g. 78%" className={fieldCls} />
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
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2"><Briefcase size={18} className="text-gray-400" /> Teaching / Work Experience</h3>
                <button type="button" onClick={() => setExperience(x => [...x, emptyExp()])} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">
                  <Plus size={15} /> Add
                </button>
              </div>
              <div className="space-y-4">
                {experience.map((exp, i) => (
                  <div key={i} className="border border-gray-100 rounded-lg p-4 bg-gray-50/50 relative">
                    {experience.length > 1 && (
                      <button type="button" onClick={() => setExperience(es => es.filter((_, idx) => idx !== i))} className="absolute top-3 right-3 p-1 text-gray-300 hover:text-red-500"><Trash2 size={15} /></button>
                    )}
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Institution / School Name</label>
                        <input value={exp.school_name} onChange={e => setExp(i, 'school_name', e.target.value)} className={fieldCls} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Designation</label>
                        <input value={exp.designation} onChange={e => setExp(i, 'designation', e.target.value)} placeholder="e.g. PRT" className={fieldCls} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
                          <input type="date" value={exp.from_date} onChange={e => setExp(i, 'from_date', e.target.value)} className={fieldCls} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
                          <input type="date" value={exp.to_date} onChange={e => setExp(i, 'to_date', e.target.value)} className={fieldCls} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Subjects Taught</label>
                        <input value={exp.subjects_taught} onChange={e => setExp(i, 'subjects_taught', e.target.value)} placeholder="e.g. Maths, Science" className={fieldCls} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Other Roles / Responsibilities</label>
                        <input value={exp.other_roles} onChange={e => setExp(i, 'other_roles', e.target.value)} placeholder="e.g. Class teacher" className={fieldCls} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resume */}
          <div className="pt-4 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Resume (PDF/DOC)</label>
            <input type="file" accept=".pdf,.doc,.docx" onChange={e => setResume(e.target.files[0])} className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          </div>

          {vacancy.screening_questions?.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Screening Questions</h3>
              {vacancy.screening_questions.map(q => (
                <div key={q.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {q.question} {q.is_knockout ? <span className="text-red-500">*</span> : ''}
                  </label>
                  <input
                    value={screeningAnswers[q.id] || ''}
                    onChange={e => setScreeningAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                    required={!!q.is_knockout}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button type="submit" disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors font-medium">
              <Send size={16} /> {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
