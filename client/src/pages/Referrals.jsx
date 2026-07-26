import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../lib/api.js';
import { useToast } from '../components/Toast.jsx';
import { UserPlus, Award, Users, X, TrendingUp } from 'lucide-react';

const statusColors = {
  submitted: 'bg-gray-100 text-gray-700',
  reviewed: 'bg-blue-100 text-blue-700',
  shortlisted: 'bg-green-100 text-green-700',
  hired: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

const statusOptions = ['submitted', 'reviewed', 'shortlisted', 'hired', 'rejected'];

export default function Referrals() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = ['super_admin', 'admin'].includes(user?.role);
  const isHR = user?.role === 'hr';

  const [referrals, setReferrals] = useState([]);
  const [stats, setStats] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [vacancies, setVacancies] = useState([]);
  const [form, setForm] = useState({ candidate_name: '', candidate_phone: '', candidate_email: '', vacancy_id: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    api.get('/referrals').then(r => setReferrals(r.data.data));
    if (isAdmin) api.get('/referrals/stats').then(r => setStats(r.data.data));
  };

  useEffect(() => { load(); }, []);

  const openModal = () => {
    api.get('/vacancies?status=open').then(r => setVacancies(r.data.data));
    setForm({ candidate_name: '', candidate_phone: '', candidate_email: '', vacancy_id: '', notes: '' });
    setShowModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.candidate_name.trim()) return toast.error('Candidate name is required');
    setSubmitting(true);
    try {
      await api.post('/referrals', { ...form, vacancy_id: form.vacancy_id || null });
      toast.success('Referral submitted successfully');
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit referral');
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/referrals/${id}/status`, { status });
      toast.success('Status updated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 p-6 mb-1 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Staff Referral Portal</h1>
            <p className="text-white/70 text-sm mt-1">Track staff referrals and rewards</p>
          </div>
          <button onClick={openModal} className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors">
            <UserPlus size={16} /> Refer a Candidate
          </button>
        </div>
      </div>

      {/* Stats (admin only) */}
      {isAdmin && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 rounded-lg"><Users size={20} className="text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-500">Total Referrals</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 rounded-lg"><Award size={20} className="text-emerald-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.hired}</p>
                <p className="text-xs text-gray-500">Hired</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-50 rounded-lg"><TrendingUp size={20} className="text-purple-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.conversion_rate}%</p>
                <p className="text-xs text-gray-500">Conversion Rate</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Referrers (admin only) */}
      {isAdmin && stats?.top_referrers?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Referrers</h3>
          <div className="flex flex-wrap gap-2">
            {stats.top_referrers.map((r, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-full text-sm">
                <span className="font-medium text-gray-800">{r.name}</span>
                <span className="text-xs text-gray-500">({r.count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Referrals Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Candidate</th>
                <th className="text-left px-4 py-3">Phone</th>
                <th className="text-left px-4 py-3">Vacancy</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Referred By</th>
                <th className="text-left px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {referrals.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No referrals yet. Be the first to refer a candidate!</td></tr>
              )}
              {referrals.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{r.candidate_name}</p>
                    {r.candidate_email && <p className="text-xs text-gray-500">{r.candidate_email}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.candidate_phone || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{r.vacancy_title || '-'}</td>
                  <td className="px-4 py-3">
                    {(isAdmin || isHR) ? (
                      <select value={r.status} onChange={e => updateStatus(r.id, e.target.value)}
                        className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer ${statusColors[r.status]}`}>
                        {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[r.status]}`}>
                        {r.status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.referrer_name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Refer a Candidate</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Candidate Name <span className="text-red-500">*</span></label>
                <input value={form.candidate_name} onChange={e => setForm(f => ({ ...f, candidate_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input value={form.candidate_phone} onChange={e => setForm(f => ({ ...f, candidate_phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={form.candidate_email} onChange={e => setForm(f => ({ ...f, candidate_email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vacancy</label>
                <select value={form.vacancy_id} onChange={e => setForm(f => ({ ...f, vacancy_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">Select vacancy (optional)</option>
                  {vacancies.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="Why are you recommending this person?" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {submitting ? 'Submitting...' : 'Submit Referral'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
