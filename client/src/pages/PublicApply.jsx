import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Send, CheckCircle, Briefcase, MapPin, GraduationCap } from 'lucide-react';

export default function PublicApply() {
  const { vacancyId } = useParams();
  const [vacancy, setVacancy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    full_name: '', father_or_husband_name: '', gender: '', date_of_birth: '',
    phone: '', whatsapp_number: '', email: '', current_city: '', current_state: '',
    salary_expected: '', earliest_join_date: '',
  });
  const [screeningAnswers, setScreeningAnswers] = useState({});
  const [resume, setResume] = useState(null);

  useEffect(() => {
    axios.get(`/api/public/careers/${vacancyId}`)
      .then(r => setVacancy(r.data.data))
      .catch(() => setError('This position is no longer accepting applications.'))
      .finally(() => setLoading(false));
  }, [vacancyId]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const formData = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v) formData.append(k, v); });
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
          <div>
            <h1 className="text-lg font-bold text-blue-700">A M World School</h1>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Salary (Monthly)</label>
              <input type="number" value={form.salary_expected} onChange={e => set('salary_expected', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. 30000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Earliest Joining Date</label>
              <input type="date" value={form.earliest_join_date} onChange={e => set('earliest_join_date', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Upload Resume (PDF/DOC)</label>
              <input type="file" accept=".pdf,.doc,.docx" onChange={e => setResume(e.target.files[0])} className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            </div>
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
