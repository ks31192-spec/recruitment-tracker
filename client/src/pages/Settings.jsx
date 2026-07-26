import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../lib/api.js';
import { Plus, Pencil, Trash2, Check, X, Shield, Download, Upload, Mail, KeyRound } from 'lucide-react';
import { useToast } from '../components/Toast.jsx';

function EditableList({ endpoint, nameKey, label }) {
  const [items, setItems] = useState([]);
  const [newVal, setNewVal] = useState('');
  const [editId, setEditId] = useState(null);
  const [editVal, setEditVal] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = () => api.get(endpoint).then(r => setItems(r.data.data));
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!newVal.trim()) return;
    await api.post(endpoint, { [nameKey]: newVal.trim() });
    setNewVal('');
    load();
  };

  const save = async (id) => {
    await api.put(`${endpoint}/${id}`, { [nameKey]: editVal });
    setEditId(null);
    load();
  };

  const del = async (id) => {
    await api.delete(`${endpoint}/${id}`);
    setConfirmDelete(null);
    load();
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input value={newVal} onChange={e => setNewVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
          placeholder={`Add new ${label.toLowerCase()}...`} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        <button onClick={add} className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"><Plus size={16} /> Add</button>
      </div>
      <div className="divide-y divide-gray-100">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between py-2.5">
            {editId === item.id ? (
              <div className="flex items-center gap-2 flex-1">
                <input value={editVal} onChange={e => setEditVal(e.target.value)} className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm" autoFocus />
                <button onClick={() => save(item.id)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check size={16} /></button>
                <button onClick={() => setEditId(null)} className="p-1 text-gray-400 hover:bg-gray-50 rounded"><X size={16} /></button>
              </div>
            ) : (
              <>
                <span className="text-sm text-gray-800">{item[nameKey]}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditId(item.id); setEditVal(item[nameKey]); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Pencil size={14} /></button>
                  {confirmDelete === item.id ? (
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-red-600">Delete?</span>
                      <button onClick={() => del(item.id)} className="px-2 py-0.5 bg-red-600 text-white rounded text-xs">Yes</button>
                      <button onClick={() => setConfirmDelete(null)} className="px-2 py-0.5 border border-gray-300 rounded text-xs">No</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'hr' });
  const [resetModal, setResetModal] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const toast = useToast();

  const load = () => api.get('/settings/users').then(r => setUsers(r.data.data));
  useEffect(() => { load(); }, []);

  const addUser = async (e) => {
    e.preventDefault();
    await api.post('/settings/users', form);
    setForm({ name: '', email: '', password: '', role: 'hr' });
    setShowForm(false);
    load();
  };

  const toggleActive = async (u) => {
    await api.put(`/settings/users/${u.id}`, { ...u, is_active: !u.is_active });
    load();
  };

  const changeRole = async (u, role) => {
    await api.put(`/settings/users/${u.id}`, { ...u, role });
    load();
  };

  const handleResetPassword = async () => {
    if (!resetPassword.trim()) return;
    setResetting(true);
    try {
      await api.post('/auth/admin-reset-password', { user_id: resetModal.id, new_password: resetPassword });
      toast.success(`Password reset for ${resetModal.name}`);
      setResetModal(null);
      setResetPassword('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div>
      <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 mb-4"><Plus size={16} /> Add User</button>
      {showForm && (
        <form onSubmit={addUser} className="bg-gray-50 rounded-lg p-4 mb-4 grid md:grid-cols-2 gap-3">
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Name" required className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" required className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Password" required className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="admin">Admin</option><option value="hr">HR</option><option value="panel_member">Panel Member</option><option value="viewer">Viewer</option>
          </select>
          <button type="submit" className="md:col-span-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Create User</button>
        </form>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr><th className="text-left px-4 py-2">Name</th><th className="text-left px-4 py-2">Email</th><th className="text-left px-4 py-2">Role</th><th className="text-left px-4 py-2">Status</th><th className="text-left px-4 py-2">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(u => (
              <tr key={u.id}>
                <td className="px-4 py-2.5 font-medium text-gray-900">{u.name}</td>
                <td className="px-4 py-2.5 text-gray-600">{u.email}</td>
                <td className="px-4 py-2.5">
                  <select value={u.role} onChange={e => changeRole(u, e.target.value)} className="text-xs border border-gray-200 rounded px-2 py-1">
                    <option value="super_admin">Super Admin</option><option value="admin">Admin</option><option value="hr">HR</option><option value="panel_member">Panel Member</option><option value="viewer">Viewer</option>
                  </select>
                </td>
                <td className="px-4 py-2.5">
                  <button onClick={() => toggleActive(u)} className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-4 py-2.5">
                  <button onClick={() => { setResetModal(u); setResetPassword(''); }} className="flex items-center gap-1 text-xs px-2 py-1 text-orange-600 hover:bg-orange-50 rounded" title="Reset Password">
                    <KeyRound size={13} /> Reset Password
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Password Reset Modal */}
      {resetModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setResetModal(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Reset Password</h3>
            <p className="text-sm text-gray-500 mb-4">Set a new password for <span className="font-medium text-gray-700">{resetModal.name}</span> ({resetModal.email})</p>
            <input
              type="password"
              value={resetPassword}
              onChange={e => setResetPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none mb-4"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleResetPassword()}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setResetModal(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleResetPassword} disabled={resetting || !resetPassword.trim()} className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50">
                {resetting ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const TEMPLATE_TYPES = [
  { value: 'interview_invite', label: 'Interview Invite' },
  { value: 'offer_letter', label: 'Offer Letter' },
  { value: 'rejection', label: 'Rejection' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'welcome', label: 'Welcome' },
  { value: 'custom', label: 'Custom' },
];

const PLACEHOLDER_VARS = '{{candidate_name}}, {{vacancy_title}}, {{interview_date}}, {{interview_time}}, {{school_name}}, {{designation}}';

function EmailTemplatesTab() {
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', subject: '', body: '', template_type: 'custom' });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/settings/email-templates').then(r => setTemplates(r.data.data));
  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ name: '', subject: '', body: '', template_type: 'custom' });
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await api.put(`/settings/email-templates/${editId}`, form);
        toast.success('Template updated');
      } else {
        await api.post('/settings/email-templates', form);
        toast.success('Template created');
      }
      resetForm();
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (t) => {
    setForm({ name: t.name, subject: t.subject, body: t.body, template_type: t.template_type });
    setEditId(t.id);
    setShowForm(true);
  };

  const del = async (id) => {
    try {
      await api.delete(`/settings/email-templates/${id}`);
      setConfirmDelete(null);
      toast.success('Template deleted');
      load();
    } catch (err) {
      toast.error('Failed to delete template');
    }
  };

  const typeLabel = (val) => TEMPLATE_TYPES.find(t => t.value === val)?.label || val;

  return (
    <div>
      <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 mb-4">
        <Plus size={16} /> {showForm && !editId ? 'Cancel' : 'Add Template'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Template name" required className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            <select value={form.template_type} onChange={e => setForm(f => ({ ...f, template_type: e.target.value }))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
              {TEMPLATE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Email subject" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Email body..." required rows={6} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-y" />
          <p className="text-xs text-gray-400">Available placeholders: <span className="text-gray-500 font-mono">{PLACEHOLDER_VARS}</span></p>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving...' : editId ? 'Update Template' : 'Create Template'}
            </button>
            {editId && <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>}
          </div>
        </form>
      )}

      <div className="divide-y divide-gray-100">
        {templates.length === 0 && !showForm && (
          <p className="text-sm text-gray-400 py-4">No email templates yet. Click "Add Template" to create one.</p>
        )}
        {templates.map(t => (
          <div key={t.id} className="py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <Mail size={14} className="text-gray-400 shrink-0" />
                  <span className="text-sm font-medium text-gray-900 truncate">{t.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 shrink-0">{typeLabel(t.template_type)}</span>
                </div>
                <p className="text-xs text-gray-500 truncate pl-[22px]">Subject: {t.subject}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => startEdit(t)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Pencil size={14} /></button>
                {confirmDelete === t.id ? (
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-red-600">Delete?</span>
                    <button onClick={() => del(t.id)} className="px-2 py-0.5 bg-red-600 text-white rounded text-xs">Yes</button>
                    <button onClick={() => setConfirmDelete(null)} className="px-2 py-0.5 border border-gray-300 rounded text-xs">No</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(t.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DataTab() {
  const toast = useToast();
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const exportCandidates = () => {
    const token = localStorage.getItem('token');
    window.open(`/api/export/candidates?token=${token}`, '_blank');
    toast.success('Export started');
  };

  const downloadBackup = () => {
    const token = localStorage.getItem('token');
    window.open(`/api/export/database-backup?token=${token}`, '_blank');
    toast.success('Backup download started');
  };

  const downloadTemplate = () => {
    const token = localStorage.getItem('token');
    window.open(`/api/export/template?token=${token}`, '_blank');
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast.error('File is empty or has no data rows'); return; }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, '').replace(/father.*name/, 'father_or_husband_name').replace(/whatsapp/, 'whatsapp_number').replace(/referrer.*/, 'referrer_name').replace(/aadhar.*/, 'aadhar_number').replace(/oasisid/, 'oasis_id').replace(/currentsalary/, 'current_salary').replace(/expectedsalary/, 'expected_salary'));
      const keyMap = { full_name: 'full_name', 'full name': 'full_name', name: 'full_name', father_or_husband_name: 'father_or_husband_name', gender: 'gender', dob: 'date_of_birth', date_of_birth: 'date_of_birth', phone: 'phone', whatsapp_number: 'whatsapp_number', email: 'email', city: 'current_city', current_city: 'current_city', state: 'current_state', current_state: 'current_state', aadhar_number: 'aadhar_number', oasis_id: 'oasis_id', current_salary: 'current_salary', expected_salary: 'expected_salary', source: 'source', referrer_name: 'referrer_name', notes: 'notes' };
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row = {};
        headers.forEach((h, idx) => { const k = keyMap[h]; if (k && vals[idx]) row[k] = vals[idx]; });
        if (row.full_name) rows.push(row);
      }
      const r = await api.post('/export/candidates-import', { rows });
      setImportResult(r.data.data);
      toast.success(`Imported ${r.data.data.imported} candidates`);
    } catch (err) { toast.error('Import failed'); }
    finally { setImporting(false); e.target.value = ''; }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Export</h3>
        <div className="flex gap-3 flex-wrap">
          <button onClick={exportCandidates} className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"><Download size={16} /> Export All Candidates (CSV)</button>
          <button onClick={downloadBackup} className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"><Download size={16} /> Download Database Backup</button>
        </div>
      </div>
      <div className="border-t border-gray-200 pt-6">
        <h3 className="font-semibold text-gray-900 mb-3">Import Candidates</h3>
        <div className="space-y-3">
          <button onClick={downloadTemplate} className="text-sm text-blue-600 hover:underline">Download CSV Template</button>
          <label className={`flex items-center justify-center gap-2 px-4 py-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors ${importing ? 'opacity-60 pointer-events-none' : ''}`}>
            <Upload size={18} className="text-gray-400" />
            <span className="text-sm text-gray-500">{importing ? 'Importing...' : 'Upload CSV file to import candidates'}</span>
            <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
          </label>
          {importResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
              <p className="font-medium text-green-800">Imported {importResult.imported} candidates</p>
              {importResult.errors?.length > 0 && (
                <div className="mt-2">
                  <p className="text-red-700 font-medium">Errors:</p>
                  {importResult.errors.map((e, i) => <p key={i} className="text-red-600 text-xs">{e}</p>)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const [tab, setTab] = useState('departments');
  const tabs = ['departments', 'designations', 'academic-years'];
  if (user?.role === 'super_admin' || user?.role === 'admin') tabs.push('email-templates');
  if (user?.role === 'super_admin') tabs.push('users', 'data');

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-700 to-gray-600 p-6 mb-1 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-white/70 text-sm mt-1">Configure your recruitment platform</p>
        </div>
      </div>
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-md capitalize whitespace-nowrap transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            {t.replace(/-/g, ' ')}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {tab === 'departments' && <EditableList endpoint="/settings/departments" nameKey="name" label="Department" />}
        {tab === 'designations' && <EditableList endpoint="/settings/designations" nameKey="title" label="Designation" />}
        {tab === 'academic-years' && <EditableList endpoint="/settings/academic-years" nameKey="label" label="Academic Year" />}
        {tab === 'email-templates' && <EmailTemplatesTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'data' && <DataTab />}
      </div>
    </div>
  );
}
