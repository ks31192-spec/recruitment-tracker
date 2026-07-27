import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../lib/api.js';
import { Plus, Pencil, Trash2, Check, X, Shield, Download, Upload, Mail, KeyRound, Palette, Send, CheckCircle2, XCircle, Building2, GraduationCap, CalendarRange, UsersRound, Database } from 'lucide-react';
import { useToast } from '../components/Toast.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import { validatePassword, PASSWORD_RULE } from '../lib/password.js';
import { useBranding } from '../context/BrandingContext.jsx';

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
    const pwError = validatePassword(form.password);
    if (pwError) { toast.error(pwError); return; }
    try {
      await api.post('/settings/users', form);
      setForm({ name: '', email: '', password: '', role: 'hr' });
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create user');
    }
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
    const pwError = validatePassword(resetPassword);
    if (pwError) { toast.error(pwError); return; }
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
          <PasswordInput value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Password" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="admin">Admin</option><option value="hr">HR</option><option value="panel_member">Panel Member</option><option value="viewer">Viewer</option>
          </select>
          <p className="md:col-span-2 -mt-1 text-xs text-gray-400">{PASSWORD_RULE}</p>
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
            <PasswordInput
              value={resetPassword}
              onChange={e => setResetPassword(e.target.value)}
              placeholder="Enter new password"
              wrapperClassName="mb-2"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleResetPassword()}
            />
            <p className="text-xs text-gray-400 mb-4">{PASSWORD_RULE}</p>
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

function resizeImage(file, maxSize = 200) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
          else { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png', 0.9));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function BrandingTab() {
  const toast = useToast();
  const branding = useBranding();
  const [form, setForm] = useState({
    school_name: '',
    school_tagline: '',
    school_short: '',
  });
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoChanged, setLogoChanged] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    api.get('/branding').then(r => {
      if (r.data.success && r.data.data) {
        setForm({
          school_name: r.data.data.school_name || 'A M World School',
          school_tagline: r.data.data.school_tagline || 'Empowering Education Since 2010',
          school_short: r.data.data.school_short || 'AM',
        });
        if (r.data.data.school_logo) setLogoPreview(r.data.data.school_logo);
      } else {
        setForm({
          school_name: branding.schoolName,
          school_tagline: branding.schoolTagline,
          school_short: branding.schoolShort,
        });
      }
    }).catch(() => {
      setForm({
        school_name: branding.schoolName,
        school_tagline: branding.schoolTagline,
        school_short: branding.schoolShort,
      });
    }).finally(() => setLoading(false));
  }, []);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    const dataUrl = await resizeImage(file, 200);
    setLogoPreview(dataUrl);
    setLogoChanged(true);
  };

  const removeLogo = () => {
    setLogoPreview(null);
    setLogoChanged(true);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSave = async () => {
    if (!form.school_name.trim() || !form.school_short.trim()) {
      toast.error('School name and short name are required');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (logoChanged) payload.school_logo = logoPreview || '';
      await api.put('/branding', payload);
      branding.refresh();
      toast.success('Branding updated!');
      setLogoChanged(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save branding');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-gray-900 mb-1">School Branding</h3>
        <p className="text-sm text-gray-500 mb-4">Customize the school name, logo, and branding shown across the recruitment platform, careers page, and candidate portal.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
          <input
            value={form.school_name}
            onChange={e => setForm(f => ({ ...f, school_name: e.target.value }))}
            placeholder="e.g. A M World School"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">School Tagline</label>
          <input
            value={form.school_tagline}
            onChange={e => setForm(f => ({ ...f, school_tagline: e.target.value }))}
            placeholder="e.g. Empowering Education Since 2010"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Short Name (Logo Initials)</label>
          <input
            value={form.school_short}
            onChange={e => setForm(f => ({ ...f, school_short: e.target.value }))}
            placeholder="e.g. AM"
            maxLength={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <p className="text-xs text-gray-400 mt-1">Used as fallback when no logo is uploaded</p>
        </div>
      </div>

      {/* Logo Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">School Logo</label>
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 shrink-0">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center">
                <span className="text-xl font-bold text-white">{form.school_short || 'AM'}</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Upload size={14} /> Upload Logo
            </button>
            {logoPreview && (
              <button onClick={removeLogo}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                <Trash2 size={14} /> Remove
              </button>
            )}
            <p className="text-xs text-gray-400">PNG, JPG, or SVG. Max 5MB. Will be resized to 200x200px.</p>
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Live Preview</label>
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl p-4">
            {logoPreview ? (
              <img src={logoPreview} alt="" className="w-10 h-10 rounded-lg object-contain" />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
                <span className="text-sm font-bold text-white">{form.school_short || 'AM'}</span>
              </div>
            )}
            <div>
              <p className="text-sm font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{form.school_name || 'School Name'}</p>
              <p className="text-xs text-slate-400">Recruitment Tracker</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white rounded-xl p-4 border border-gray-200">
            {logoPreview ? (
              <img src={logoPreview} alt="" className="w-14 h-14 rounded-2xl object-contain" />
            ) : (
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center">
                <span className="text-xl font-bold text-white">{form.school_short || 'AM'}</span>
              </div>
            )}
            <div>
              <p className="text-lg font-bold text-gray-900">{form.school_name || 'School Name'}</p>
              <p className="text-sm text-gray-500">{form.school_tagline || 'Tagline'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
        >
          <Palette size={16} />
          {saving ? 'Saving...' : 'Save Branding'}
        </button>
      </div>
    </div>
  );
}

function EmailSettingsTab() {
  const toast = useToast();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testEmail, setTestEmail] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.get('/email/status').then(r => setStatus(r.data.data)).catch(() => setStatus({ configured: false })).finally(() => setLoading(false));
  }, []);

  const sendTest = async () => {
    if (!testEmail.trim()) return;
    setSending(true);
    try {
      await api.post('/email/test', { to: testEmail });
      toast.success('Test email sent! Check your inbox.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send test email');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-gray-900 mb-1">Email Configuration</h3>
        <p className="text-sm text-gray-500 mb-4">Emails are sent automatically for password resets, interview invitations, offer letters, and rejections.</p>
      </div>

      <div className={`rounded-xl border p-4 ${status?.configured ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
        <div className="flex items-center gap-3">
          {status?.configured ? (
            <CheckCircle2 size={20} className="text-green-600 shrink-0" />
          ) : (
            <XCircle size={20} className="text-red-500 shrink-0" />
          )}
          <div>
            <p className={`font-medium text-sm ${status?.configured ? 'text-green-800' : 'text-red-800'}`}>
              {status?.configured ? 'Email is configured and ready' : 'Email is not configured'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {status?.configured ? (
                <>Provider: {status.provider} &middot; From: {status.from}</>
              ) : (
                <>Set the <code className="bg-white/60 px-1 rounded text-xs">RESEND_API_KEY</code> environment variable in Vercel to enable email sending.</>
              )}
            </p>
          </div>
        </div>
      </div>

      {status?.configured && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Send Test Email</h4>
          <div className="flex gap-2">
            <input
              type="email"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              placeholder="Enter email address..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              onKeyDown={e => e.key === 'Enter' && sendTest()}
            />
            <button
              onClick={sendTest}
              disabled={sending || !testEmail.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Send size={14} /> {sending ? 'Sending...' : 'Send Test'}
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Automatic Emails</h4>
        <div className="space-y-2">
          {[
            { label: 'Password Reset', desc: 'Sent when a user requests to reset their password' },
            { label: 'Interview Invitation', desc: 'Sent to candidates when an interview or demo is scheduled' },
            { label: 'Offer Letter', desc: 'Sent to candidates when an offer is created' },
            { label: 'Rejection Notice', desc: 'Sent to candidates when their application is rejected' },
            { label: 'Custom Emails', desc: 'Sent via the Communication modal using templates or custom content' },
          ].map(item => (
            <div key={item.label} className="flex items-start gap-3 py-2">
              <Mail size={14} className="text-blue-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!status?.configured && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Setup Instructions</h4>
          <ol className="text-xs text-blue-700 space-y-1.5 list-decimal list-inside">
            <li>Create a free account at <strong>resend.com</strong></li>
            <li>Verify your domain or use the free testing domain</li>
            <li>Generate an API key from the Resend dashboard</li>
            <li>Add <code className="bg-white/60 px-1 rounded">RESEND_API_KEY</code> to your Vercel environment variables</li>
            <li>Optionally set <code className="bg-white/60 px-1 rounded">EMAIL_FROM</code> (e.g., "School Name &lt;hr@yourdomain.com&gt;")</li>
            <li>Redeploy the application</li>
          </ol>
        </div>
      )}
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

// A colour per tab: the banner adopts it, the content card gets a matching
// accent strip, and the tab's icon carries it whether active or not.
// Class strings are written out in full so Tailwind doesn't purge them.
const TAB_META = {
  'branding': {
    label: 'Branding', icon: Palette, desc: 'Name, logo and colours shown across the platform',
    banner: 'from-violet-600 via-purple-600 to-fuchsia-600',
    bar: 'bg-gradient-to-r from-violet-500 to-purple-500', text: 'text-violet-600',
  },
  'departments': {
    label: 'Departments', icon: Building2, desc: 'The departments vacancies can belong to',
    banner: 'from-blue-600 via-indigo-600 to-violet-600',
    bar: 'bg-gradient-to-r from-blue-500 to-indigo-500', text: 'text-blue-600',
  },
  'designations': {
    label: 'Designations', icon: GraduationCap, desc: 'Post titles such as PRT, TGT and PGT',
    banner: 'from-emerald-600 via-teal-600 to-cyan-600',
    bar: 'bg-gradient-to-r from-emerald-500 to-teal-500', text: 'text-emerald-600',
  },
  'academic-years': {
    label: 'Academic Years', icon: CalendarRange, desc: 'Sessions vacancies are recruited against',
    banner: 'from-amber-500 via-orange-500 to-red-500',
    bar: 'bg-gradient-to-r from-amber-500 to-orange-500', text: 'text-amber-600',
  },
  'email-templates': {
    label: 'Email Templates', icon: Mail, desc: 'Reusable messages for candidate communication',
    banner: 'from-cyan-600 via-sky-600 to-blue-600',
    bar: 'bg-gradient-to-r from-cyan-500 to-sky-500', text: 'text-cyan-600',
  },
  'email': {
    label: 'Email', icon: Send, desc: 'Delivery provider and automatic emails',
    banner: 'from-teal-600 via-emerald-600 to-green-600',
    bar: 'bg-gradient-to-r from-teal-500 to-emerald-500', text: 'text-teal-600',
  },
  'users': {
    label: 'Users', icon: UsersRound, desc: 'Who can sign in, and what they can do',
    banner: 'from-rose-600 via-pink-600 to-fuchsia-600',
    bar: 'bg-gradient-to-r from-rose-500 to-pink-500', text: 'text-rose-600',
  },
  'data': {
    label: 'Data', icon: Database, desc: 'Import, export and backups',
    banner: 'from-slate-700 via-slate-600 to-gray-600',
    bar: 'bg-gradient-to-r from-slate-500 to-gray-500', text: 'text-slate-600',
  },
};

export default function Settings() {
  const { user } = useAuth();
  const [tab, setTab] = useState('branding');
  const meta = TAB_META[tab];
  const tabs = ['branding', 'departments', 'designations', 'academic-years'];
  if (user?.role === 'super_admin' || user?.role === 'admin') tabs.push('email-templates');
  if (user?.role === 'super_admin') tabs.push('email', 'users', 'data');

  return (
    <div className="space-y-5">
      {/* Banner takes the active tab's colour, so the header says where you are */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${meta.banner} p-6 mb-1 text-white transition-colors duration-300`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative flex items-center gap-3">
          <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/20 shrink-0">
            <meta.icon size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-white/70 text-sm mt-0.5">{meta.desc}</p>
          </div>
        </div>
      </div>
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
        {tabs.map(t => {
          const m = TAB_META[t];
          const active = tab === t;
          return (
            <button key={t} onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                active ? `bg-white shadow-sm ${m.text}` : 'text-gray-600 hover:text-gray-900'
              }`}>
              {/* Icons keep their colour whether or not the tab is active */}
              <m.icon size={15} className={m.text} />
              {m.label}
            </button>
          );
        })}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className={`h-1 ${meta.bar}`} />
        <div className="p-6">
          {tab === 'branding' && <BrandingTab />}
          {tab === 'departments' && <EditableList endpoint="/settings/departments" nameKey="name" label="Department" />}
          {tab === 'designations' && <EditableList endpoint="/settings/designations" nameKey="title" label="Designation" />}
          {tab === 'academic-years' && <EditableList endpoint="/settings/academic-years" nameKey="label" label="Academic Year" />}
          {tab === 'email-templates' && <EmailTemplatesTab />}
          {tab === 'email' && <EmailSettingsTab />}
          {tab === 'users' && <UsersTab />}
          {tab === 'data' && <DataTab />}
        </div>
      </div>
    </div>
  );
}
