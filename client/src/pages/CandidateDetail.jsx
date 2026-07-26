import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../lib/api.js';
import { useToast } from '../components/Toast.jsx';
import ScheduleInterviewModal from '../components/ScheduleInterviewModal.jsx';
import EvaluationModal from '../components/EvaluationModal.jsx';
import EvaluationView from '../components/EvaluationView.jsx';
import StructuredEvaluation from '../components/StructuredEvaluation.jsx';
import CommunicationModal from '../components/CommunicationModal.jsx';
import OfferModal from '../components/OfferModal.jsx';
import CandidateTimeline from '../components/CandidateTimeline.jsx';
import InterviewRemarks from '../components/InterviewRemarks.jsx';
import { ArrowLeft, Edit, Briefcase, FileText, Phone, Mail, MapPin, Plus, CalendarCheck, MessageCircle, Star, Gift, Upload, Tag, X, ShieldBan, StickyNote, Trash2, Download, ChevronDown, Clock, Eye, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';

const sourceLabels = { walk_in: 'Walk-in', naukri: 'Naukri', whatsapp: 'WhatsApp', referral: 'Referral', website: 'Website', direct_call: 'Direct Call', other: 'Other' };
const stageColors = {
  applied: 'bg-gray-100 text-gray-700', shortlisted: 'bg-blue-100 text-blue-700', interview_scheduled: 'bg-indigo-100 text-indigo-700',
  interview_done: 'bg-violet-100 text-violet-700', demo_scheduled: 'bg-cyan-100 text-cyan-700', demo_done: 'bg-teal-100 text-teal-700',
  selected: 'bg-green-100 text-green-700', offer_made: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-700',
  joined: 'bg-green-200 text-green-800', waitlisted: 'bg-amber-100 text-amber-700', declined: 'bg-orange-100 text-orange-700',
};
const commTypeIcons = { call: Phone, whatsapp: MessageCircle, email: Mail, sms: MessageCircle, in_person: MapPin };

const OFFER_STAGES = ['offer_made', 'joined'];

export default function CandidateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [candidate, setCandidate] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [communications, setCommunications] = useState([]);
  const [tab, setTab] = useState('overview');
  const [vacancies, setVacancies] = useState([]);
  const [applyVacancy, setApplyVacancy] = useState('');
  const [showApply, setShowApply] = useState(false);
  const [scheduleModal, setScheduleModal] = useState(null);
  const [evalModal, setEvalModal] = useState(null);
  const [evalView, setEvalView] = useState(null);
  const [commModal, setCommModal] = useState(false);
  const [offerModal, setOfferModal] = useState(null);
  const [structuredEval, setStructuredEval] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Notes state
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState(null);

  // Tags state
  const [candidateTags, setCandidateTags] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  const [creatingTag, setCreatingTag] = useState(false);
  const tagDropdownRef = useRef(null);

  // Blacklist state
  const [blacklist, setBlacklist] = useState(null);
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState('');
  const [blacklisting, setBlacklisting] = useState(false);

  // Aadhar reveal + verification state
  const [revealedAadhar, setRevealedAadhar] = useState(null);
  const [verifications, setVerifications] = useState([]);
  const [savingVer, setSavingVer] = useState(false);

  const load = () => {
    api.get(`/candidates/${id}`).then(r => {
      setCandidate(r.data.data);
      setVerifications(r.data.data.verification_items || []);
      setRevealedAadhar(null);
    });
    api.get(`/candidates/${id}/timeline`).then(r => setTimeline(r.data.data));
  };

  const handleRevealAadhar = async () => {
    try {
      const r = await api.get(`/candidates/${id}/aadhar`);
      setRevealedAadhar(r.data.data.aadhar_number || '—');
    } catch { toast.error('Not permitted to view Aadhar'); }
  };

  const setVerStatus = (idx, status) => {
    setVerifications(vs => vs.map((v, i) => i === idx ? { ...v, status } : v));
  };
  const setVerNotes = (idx, notes) => {
    setVerifications(vs => vs.map((v, i) => i === idx ? { ...v, notes } : v));
  };
  const saveVerifications = async () => {
    setSavingVer(true);
    try {
      const r = await api.put(`/candidates/${id}/verifications`, { verifications });
      setVerifications(r.data.data);
      toast.success('Verification status saved');
    } catch { toast.error('Failed to save'); }
    finally { setSavingVer(false); }
  };

  const loadTags = () => {
    api.get(`/candidates/${id}/tags`).then(r => setCandidateTags(r.data.data));
    api.get('/candidates/meta/tags').then(r => setAllTags(r.data.data));
  };

  const loadBlacklist = () => {
    api.get(`/candidates/${id}/blacklist`).then(r => setBlacklist(r.data.data || null));
  };

  const loadNotes = () => {
    api.get(`/candidates/${id}/notes`).then(r => setNotes(r.data.data));
  };

  useEffect(() => {
    load();
    loadTags();
    loadBlacklist();
    loadNotes();
  }, [id]);

  // Close tag dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target)) {
        setShowTagDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleApply = async () => {
    if (!applyVacancy) return;
    try {
      await api.post('/applications', { candidate_id: +id, vacancy_id: +applyVacancy });
      toast.success('Applied successfully');
      setShowApply(false);
      setApplyVacancy('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const openApply = async () => {
    const r = await api.get('/vacancies', { params: { status: 'open' } });
    setVacancies(r.data.data);
    setShowApply(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', 'other');
    try {
      await api.post(`/candidates/${id}/documents`, formData);
      toast.success('Document uploaded');
      load();
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('photo', file);
    try {
      await api.post(`/candidates/${id}/photo`, formData);
      toast.success('Photo updated');
      load();
    } catch { toast.error('Upload failed'); }
    finally { e.target.value = ''; }
  };

  // --- Notes handlers ---
  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      await api.post(`/candidates/${id}/notes`, { note: newNote.trim() });
      toast.success('Note added');
      setNewNote('');
      loadNotes();
    } catch { toast.error('Failed to add note'); }
    finally { setAddingNote(false); }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await api.delete(`/candidates/${id}/notes/${noteId}`);
      toast.success('Note deleted');
      setDeletingNoteId(null);
      loadNotes();
    } catch { toast.error('Failed to delete note'); }
  };

  // --- Tags handlers ---
  const handleAddTag = async (tagId) => {
    try {
      await api.post(`/candidates/${id}/tags`, { tag_id: tagId });
      toast.success('Tag added');
      loadTags();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to add tag'); }
  };

  const handleRemoveTag = async (tagId) => {
    try {
      await api.delete(`/candidates/${id}/tags/${tagId}`);
      toast.success('Tag removed');
      loadTags();
    } catch { toast.error('Failed to remove tag'); }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    setCreatingTag(true);
    try {
      const r = await api.post('/candidates/meta/tags', { name: newTagName.trim(), color: newTagColor });
      toast.success('Tag created');
      setNewTagName('');
      setNewTagColor('#3b82f6');
      loadTags();
      // Also add it to this candidate
      if (r.data?.data?.id) handleAddTag(r.data.data.id);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create tag'); }
    finally { setCreatingTag(false); }
  };

  // --- Blacklist handlers ---
  const handleBlacklist = async () => {
    if (!blacklistReason.trim()) return;
    setBlacklisting(true);
    try {
      await api.post(`/candidates/${id}/blacklist`, { reason: blacklistReason.trim() });
      toast.success('Candidate blacklisted');
      setShowBlacklistModal(false);
      setBlacklistReason('');
      loadBlacklist();
    } catch { toast.error('Failed to blacklist'); }
    finally { setBlacklisting(false); }
  };

  const handleRemoveBlacklist = async () => {
    if (!confirm('Remove this candidate from the blacklist?')) return;
    try {
      await api.delete(`/candidates/${id}/blacklist`);
      toast.success('Removed from blacklist');
      loadBlacklist();
    } catch { toast.error('Failed to remove from blacklist'); }
  };

  const handleDownloadOffer = (offerId) => {
    const token = localStorage.getItem('token');
    window.open(`/api/offers/${offerId}/letter?token=${encodeURIComponent(token)}`, '_blank');
  };

  if (!candidate) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  const tabs = ['overview', 'applications', 'interviews', 'qualifications', 'experience', 'verification', 'documents', 'timeline', 'notes'];
  const verifiedCount = verifications.filter(v => v.status === 'verified').length;
  const interviews = timeline.filter(e => e.type === 'interview');

  // Tags not yet assigned to this candidate
  const availableTags = allTags.filter(t => !candidateTags.some(ct => ct.id === t.id));

  return (
    <div className="space-y-6">
      {/* Blacklist banner */}
      {blacklist && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <ShieldBan size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-800">This candidate is blacklisted</p>
            <p className="text-sm text-red-700 mt-0.5">{blacklist.reason}</p>
            <p className="text-xs text-red-500 mt-1">Since {new Date(blacklist.created_at).toLocaleDateString()}</p>
          </div>
          <button onClick={handleRemoveBlacklist} className="px-3 py-1.5 text-xs font-medium text-red-700 border border-red-300 rounded-lg hover:bg-red-100 flex-shrink-0">
            Remove from Blacklist
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate('/candidates')} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} /></button>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="relative group">
            {candidate.photo_path ? (
              <img src={`/${candidate.photo_path}`} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-gray-200" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-600">
                {candidate.full_name?.charAt(0)}
              </div>
            )}
            <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
              <Upload size={16} className="text-white" />
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{candidate.full_name}</h1>
            <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5 flex-wrap">
              {candidate.phone && <span className="flex items-center gap-1"><Phone size={14} />{candidate.phone}</span>}
              {candidate.email && <span className="flex items-center gap-1"><Mail size={14} />{candidate.email}</span>}
              {candidate.current_city && <span className="flex items-center gap-1"><MapPin size={14} />{candidate.current_city}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setCommModal(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"><MessageCircle size={16} /> Log Call</button>
          <button onClick={openApply} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"><Briefcase size={16} /> Apply</button>
          {blacklist ? (
            <button onClick={handleRemoveBlacklist} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-red-300 text-red-700 rounded-lg hover:bg-red-50"><ShieldBan size={16} /> Unblacklist</button>
          ) : (
            <button onClick={() => setShowBlacklistModal(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-red-600"><ShieldBan size={16} /> Blacklist</button>
          )}
          <Link to={`/candidates/${id}/edit`} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"><Edit size={16} /> Edit</Link>
        </div>
      </div>

      {/* Tags section */}
      <div className="flex items-center gap-2 flex-wrap" ref={tagDropdownRef}>
        <Tag size={16} className="text-gray-400" />
        {candidateTags.map(tag => (
          <span key={tag.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white cursor-default group"
            style={{ backgroundColor: tag.color || '#6b7280' }}>
            {tag.name}
            <button onClick={() => handleRemoveTag(tag.id)} className="opacity-60 hover:opacity-100 ml-0.5" title="Remove tag">
              <X size={12} />
            </button>
          </span>
        ))}
        <div className="relative">
          <button onClick={() => setShowTagDropdown(!showTagDropdown)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-500 border border-dashed border-gray-300 rounded-full hover:border-gray-400 hover:text-gray-700">
            <Plus size={12} /> Add Tag
          </button>
          {showTagDropdown && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-30 py-1">
              {availableTags.length > 0 && (
                <div className="max-h-40 overflow-y-auto">
                  {availableTags.map(tag => (
                    <button key={tag.id} onClick={() => { handleAddTag(tag.id); setShowTagDropdown(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color || '#6b7280' }} />
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="border-t border-gray-100 p-2">
                <p className="text-xs text-gray-400 mb-1.5">Create new tag</p>
                <div className="flex gap-1.5">
                  <input type="color" value={newTagColor} onChange={e => setNewTagColor(e.target.value)}
                    className="w-8 h-8 rounded border border-gray-200 cursor-pointer p-0.5" />
                  <input type="text" value={newTagName} onChange={e => setNewTagName(e.target.value)}
                    placeholder="Tag name" className="flex-1 text-sm px-2 py-1 border border-gray-200 rounded-md min-w-0"
                    onKeyDown={e => e.key === 'Enter' && handleCreateTag()} />
                  <button onClick={handleCreateTag} disabled={!newTagName.trim() || creatingTag}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-md capitalize whitespace-nowrap transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {tab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Personal Details</h3>
              <dl className="space-y-2 text-sm">
                {[['Father/Husband', candidate.father_or_husband_name], ['Gender', candidate.gender], ['DOB', candidate.date_of_birth], ['WhatsApp', candidate.whatsapp_number], ['State', candidate.current_state], ['Oasis ID', candidate.oasis_id], ['Source', sourceLabels[candidate.source] || candidate.source]].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="flex"><dt className="w-36 text-gray-500">{k}</dt><dd className="text-gray-900 capitalize">{v}</dd></div>
                ))}
                {candidate.aadhar_number && (
                  <div className="flex items-center"><dt className="w-36 text-gray-500">Aadhar</dt>
                    <dd className="text-gray-900 flex items-center gap-2">
                      <span className="font-mono">{revealedAadhar || candidate.aadhar_number}</span>
                      {candidate.can_reveal_aadhar && !revealedAadhar && (
                        <button onClick={handleRevealAadhar} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline" title="Reveal (logged)">
                          <Eye size={12} /> Reveal
                        </button>
                      )}
                    </dd>
                  </div>
                )}
                {candidate.referrer_name && <div className="flex"><dt className="w-36 text-gray-500">Referrer</dt><dd className="text-gray-900">{candidate.referrer_name}</dd></div>}
              </dl>
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Salary & Status</h3>
              <dl className="space-y-2 text-sm">
                {candidate.is_fresher ? (
                  <div className="flex"><dt className="w-36 text-gray-500">Experience</dt><dd><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">Fresher</span></dd></div>
                ) : (
                  <div className="flex"><dt className="w-36 text-gray-500">Current Salary</dt><dd className="text-gray-900">{candidate.current_salary ? `₹${Number(candidate.current_salary).toLocaleString('en-IN')}/mo` : '—'}</dd></div>
                )}
                <div className="flex"><dt className="w-36 text-gray-500">Expected Salary</dt><dd className="text-gray-900">{candidate.expected_salary ? `₹${Number(candidate.expected_salary).toLocaleString('en-IN')}/mo` : '—'}</dd></div>
              </dl>
              {candidate.notes && <div className="pt-2"><h3 className="font-semibold text-gray-900 mb-2">Notes</h3><p className="text-sm text-gray-600 whitespace-pre-wrap">{candidate.notes}</p></div>}
            </div>
          </div>
        )}

        {tab === 'applications' && (
          <div className="space-y-3">
            {candidate.applications?.length === 0 ? <p className="text-sm text-gray-500">No applications yet.</p> : candidate.applications?.map(a => (
              <div key={a.id} className="p-4 border border-gray-100 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <Link to={`/vacancies/${a.vacancy_id}`} className="font-medium text-gray-900 hover:text-blue-600">{a.vacancy_title}</Link>
                    <p className="text-xs text-gray-500 mt-0.5">{a.department_name} {a.subject ? `- ${a.subject}` : ''}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${stageColors[a.current_stage] || 'bg-gray-100 text-gray-600'}`}>{a.current_stage.replace(/_/g, ' ')}</span>
                    <p className="text-xs text-gray-400 mt-1">Applied: {a.applied_date}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50 flex-wrap">
                  <button onClick={() => setScheduleModal(a.id)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50"><CalendarCheck size={13} /> Schedule Interview</button>
                  {a.current_stage === 'selected' && (
                    <button onClick={() => setOfferModal(a.id)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700"><Gift size={13} /> Make Offer</button>
                  )}
                  {OFFER_STAGES.includes(a.current_stage) && a.offer_id && (
                    <button onClick={() => handleDownloadOffer(a.offer_id)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"><Download size={13} /> Offer Letter PDF</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'qualifications' && (
          <div className="space-y-3">
            {candidate.qualifications?.length === 0 ? <p className="text-sm text-gray-500">No qualifications added.</p> : candidate.qualifications?.map(q => (
              <div key={q.id} className="p-4 border border-gray-100 rounded-lg">
                <p className="font-medium text-gray-900">{q.degree} {q.specialization ? `(${q.specialization})` : ''}</p>
                <p className="text-sm text-gray-500">{q.university} {q.is_appearing ? '- Appearing' : (q.year_of_passing ? `- ${q.year_of_passing}` : '')}</p>
                <div className="flex gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                  {q.percentage_or_cgpa && <span>{q.percentage_or_cgpa}</span>}
                  {q.is_appearing ? <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Appearing</span> : null}
                  {q.is_bed ? <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">B.Ed</span> : null}
                  {q.is_deled ? <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">D.El.Ed</span> : null}
                  {q.net_qualified ? <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">NET</span> : null}
                  {q.ctet_score ? <span>CTET: {q.ctet_score}</span> : null}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'experience' && (
          <div className="space-y-3">
            {candidate.experience?.length === 0 ? <p className="text-sm text-gray-500">No experience added.</p> : candidate.experience?.map(exp => (
              <div key={exp.id} className="p-4 border border-gray-100 rounded-lg">
                <p className="font-medium text-gray-900">{exp.designation} at {exp.school_name}</p>
                <p className="text-sm text-gray-500">{exp.from_date} - {exp.to_date || 'Present'}</p>
                {exp.subjects_taught && <p className="text-xs text-gray-500 mt-1">Subjects: {exp.subjects_taught}</p>}
                {exp.other_roles && <p className="text-xs text-gray-500 mt-0.5">Other roles: {exp.other_roles}</p>}
                {exp.reason_for_leaving && <p className="text-xs text-gray-400 mt-1">Left: {exp.reason_for_leaving}</p>}
              </div>
            ))}
          </div>
        )}

        {tab === 'verification' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-gray-400" />
                <span className="text-sm text-gray-600">{verifiedCount} of {verifications.length} verified</span>
              </div>
              <button onClick={saveVerifications} disabled={savingVer}
                className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {savingVer ? 'Saving...' : 'Save Verification Status'}
              </button>
            </div>
            <div className="space-y-2">
              {verifications.map((v, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border border-gray-100 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{v.item}</p>
                    {v.verified_at && (v.status === 'verified' || v.status === 'flagged') && (
                      <p className="text-xs text-gray-400 mt-0.5">{v.verified_by_name} · {new Date(v.verified_at).toLocaleDateString('en-IN')}</p>
                    )}
                  </div>
                  <input value={v.notes || ''} onChange={e => setVerNotes(i, e.target.value)} placeholder="Notes (optional)"
                    className="text-sm px-2 py-1.5 border border-gray-200 rounded-lg sm:w-48 focus:ring-2 focus:ring-blue-500 outline-none" />
                  <div className="flex gap-1 shrink-0">
                    {[['verified', 'Verified', CheckCircle2, 'green'], ['pending', 'Pending', Clock, 'gray'], ['flagged', 'Flagged', XCircle, 'red']].map(([status, label, Icon, color]) => (
                      <button key={status} onClick={() => setVerStatus(i, status)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                          v.status === status
                            ? (color === 'green' ? 'bg-green-100 text-green-700 border-green-300' : color === 'red' ? 'bg-red-100 text-red-700 border-red-300' : 'bg-gray-200 text-gray-700 border-gray-300')
                            : 'border-gray-200 text-gray-400 hover:bg-gray-50'}`}>
                        <Icon size={13} /> {label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'documents' && (
          <div className="space-y-3">
            <label className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
              <Upload size={18} className="text-gray-400" />
              <span className="text-sm text-gray-500">{uploading ? 'Uploading...' : 'Upload Document'}</span>
              <input type="file" onChange={handleFileUpload} className="hidden" />
            </label>
            {candidate.documents?.length === 0 ? <p className="text-sm text-gray-500">No documents uploaded.</p> : candidate.documents?.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-gray-400" />
                  <div><p className="text-sm font-medium text-gray-900">{doc.file_name}</p><p className="text-xs text-gray-500 capitalize">{doc.doc_type.replace(/_/g, ' ')}</p></div>
                </div>
                <a href={`/${doc.file_path}`} target="_blank" className="text-sm text-blue-600 hover:underline">View</a>
              </div>
            ))}
          </div>
        )}

        {tab === 'interviews' && (
          <InterviewRemarks candidateId={+id} />
        )}

        {tab === 'timeline' && (
          <CandidateTimeline candidateId={+id} />
        )}

        {tab === 'notes' && (
          <div className="space-y-4">
            {/* Add note input */}
            <div className="flex gap-2">
              <textarea value={newNote} onChange={e => setNewNote(e.target.value)}
                placeholder="Write an internal note..." rows={2}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              <button onClick={handleAddNote} disabled={!newNote.trim() || addingNote}
                className="self-end px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5">
                <StickyNote size={14} /> {addingNote ? 'Adding...' : 'Add Note'}
              </button>
            </div>
            {/* Notes list */}
            {notes.length === 0 ? <p className="text-sm text-gray-500">No notes yet.</p> : notes.map(n => (
              <div key={n.id} className="p-4 border border-gray-100 rounded-lg group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{n.note}</p>
                    <p className="text-xs text-gray-400 mt-2">{n.user_name} &middot; {new Date(n.created_at).toLocaleString()}</p>
                  </div>
                  {deletingNoteId === n.id ? (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs text-red-600">Delete?</span>
                      <button onClick={() => handleDeleteNote(n.id)} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">Yes</button>
                      <button onClick={() => setDeletingNoteId(null)} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">No</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeletingNoteId(n.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" title="Delete note">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showApply && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Apply to Vacancy</h3>
            <select value={applyVacancy} onChange={e => setApplyVacancy(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4">
              <option value="">Select a vacancy...</option>
              {vacancies.map(v => <option key={v.id} value={v.id}>{v.title} ({v.department_name})</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowApply(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleApply} disabled={!applyVacancy} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* Blacklist modal */}
      {showBlacklistModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2 text-red-700 flex items-center gap-2"><ShieldBan size={20} /> Blacklist Candidate</h3>
            <p className="text-sm text-gray-500 mb-4">This candidate will be flagged and a red banner will appear on their profile.</p>
            <textarea value={blacklistReason} onChange={e => setBlacklistReason(e.target.value)}
              placeholder="Reason for blacklisting..." rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4" />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowBlacklistModal(false); setBlacklistReason(''); }} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleBlacklist} disabled={!blacklistReason.trim() || blacklisting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                {blacklisting ? 'Blacklisting...' : 'Blacklist'}
              </button>
            </div>
          </div>
        </div>
      )}

      {scheduleModal && <ScheduleInterviewModal applicationId={scheduleModal} onClose={() => setScheduleModal(null)} onDone={() => { toast.success('Interview scheduled'); load(); }} />}
      {evalModal && <EvaluationModal interviewId={evalModal} onClose={() => setEvalModal(null)} onDone={() => { toast.success('Evaluation submitted'); load(); }} />}
      {structuredEval && <StructuredEvaluation interviewId={structuredEval} onClose={() => setStructuredEval(null)} onDone={() => { toast.success('Evaluation submitted'); load(); }} />}
      {evalView && <EvaluationView interviewId={evalView} onClose={() => setEvalView(null)} />}
      {commModal && <CommunicationModal candidateId={+id} onClose={() => setCommModal(false)} onDone={() => { toast.success('Communication logged'); load(); }} />}
      {offerModal && <OfferModal applicationId={offerModal} onClose={() => setOfferModal(null)} onDone={() => { toast.success('Offer created'); load(); }} />}
    </div>
  );
}
