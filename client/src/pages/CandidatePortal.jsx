import { useState, useCallback } from 'react';
import {
  Phone,
  KeyRound,
  Loader2,
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  User,
  Mail,
  MapPin,
  ArrowRight,
  Shield,
  X,
  Briefcase,
} from 'lucide-react';
import axios from 'axios';
import { useBranding } from '../context/BrandingContext.jsx';
import SchoolLogo from '../components/SchoolLogo.jsx';

const STAGES_PIPELINE = [
  'applied',
  'shortlisted',
  'interview_scheduled',
  'interview_done',
  'demo_scheduled',
  'demo_done',
  'selected',
  'offer_made',
  'joined',
];

const TERMINAL_STAGES = ['declined', 'no_response', 'rejected', 'waitlisted'];

// Cycled across application cards so several applications stay distinguishable.
const APP_ACCENTS = [
  'bg-gradient-to-b from-indigo-500 to-blue-500',
  'bg-gradient-to-b from-emerald-500 to-teal-500',
  'bg-gradient-to-b from-violet-500 to-purple-500',
  'bg-gradient-to-b from-amber-500 to-orange-500',
  'bg-gradient-to-b from-rose-500 to-pink-500',
  'bg-gradient-to-b from-cyan-500 to-sky-500',
];

const STAGE_COLORS = {
  applied: 'bg-blue-100 text-blue-700',
  shortlisted: 'bg-indigo-100 text-indigo-700',
  interview_scheduled: 'bg-purple-100 text-purple-700',
  interview_done: 'bg-purple-200 text-purple-800',
  demo_scheduled: 'bg-amber-100 text-amber-700',
  demo_done: 'bg-amber-200 text-amber-800',
  selected: 'bg-emerald-100 text-emerald-700',
  offer_made: 'bg-teal-100 text-teal-700',
  joined: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-700',
  no_response: 'bg-gray-100 text-gray-600',
  rejected: 'bg-red-100 text-red-700',
  waitlisted: 'bg-orange-100 text-orange-700',
};

function stageLabel(s) {
  if (!s) return '';
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function StageProgress({ currentStage }) {
  const isTerminal = TERMINAL_STAGES.includes(currentStage);
  const currentIdx = STAGES_PIPELINE.indexOf(currentStage);

  return (
    <div className="mt-4">
      <div className="flex items-center gap-0 overflow-x-auto pb-2">
        {STAGES_PIPELINE.map((stage, i) => {
          const isActive = stage === currentStage;
          const isPast = !isTerminal && currentIdx >= 0 && i < currentIdx;
          const isCurrent = !isTerminal && isActive;

          return (
            <div key={stage} className="flex items-center">
              <div className="flex flex-col items-center min-w-[70px]">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    isCurrent
                      ? 'bg-blue-600 border-blue-600 ring-4 ring-blue-100'
                      : isPast
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'bg-white border-gray-300'
                  }`}
                >
                  {(isPast || isCurrent) && (
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  )}
                </div>
                <span
                  className={`text-[10px] mt-1 text-center leading-tight ${
                    isCurrent ? 'font-semibold text-blue-700' : isPast ? 'text-emerald-600' : 'text-gray-400'
                  }`}
                >
                  {stageLabel(stage)}
                </span>
              </div>
              {i < STAGES_PIPELINE.length - 1 && (
                <div
                  className={`h-0.5 w-4 shrink-0 -mt-4 ${
                    isPast ? 'bg-emerald-400' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
      {isTerminal && (
        <div className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-medium ${STAGE_COLORS[currentStage] || 'bg-gray-100 text-gray-600'}`}>
          {stageLabel(currentStage)}
        </div>
      )}
    </div>
  );
}

export default function CandidatePortal() {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [displayOtp, setDisplayOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const { schoolName } = useBranding();

  const requestOtp = async () => {
    setError('');
    if (!phone.trim()) { setError('Please enter your phone number'); return; }
    setLoading(true);
    try {
      const res = await axios.post('/api/portal/request-otp', { phone: phone.trim() });
      setDisplayOtp(res.data.data.otp);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError('');
    if (!otp.trim()) { setError('Please enter the OTP'); return; }
    setLoading(true);
    try {
      const res = await axios.post('/api/portal/verify-otp', { phone: phone.trim(), otp: otp.trim() });
      setData(res.data.data);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = useCallback(async (file) => {
    if (!file || !data?.candidate?.id) return;
    setUploading(true);
    setUploadSuccess('');
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('candidate_id', data.candidate.id);
      const res = await axios.post('/api/portal/upload-document', fd);
      setUploadSuccess(`Uploaded: ${res.data.data.file_name}`);
      setData(prev => ({
        ...prev,
        documents: [...(prev.documents || []), { id: res.data.data.id, file_name: res.data.data.file_name, doc_type: 'other', uploaded_at: new Date().toISOString() }],
      }));
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [data]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50">
      {/* Header */}
      <header className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 text-white shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative max-w-4xl mx-auto px-4 py-6 flex items-center gap-3">
          <SchoolLogo size={36} rounded="rounded-lg" />
          <div>
            <h1 className="text-xl font-bold">{schoolName}</h1>
            <p className="text-white/70 text-sm">Candidate Portal</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Step 1: Phone Input */}
        {step === 1 && (
          <div className="max-w-md mx-auto">
            <div className="backdrop-blur bg-white/95 rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Phone className="w-7 h-7 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Check Your Application Status</h2>
                <p className="text-gray-500 text-sm mt-1">Enter the phone number you used while applying</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && requestOtp()}
                    placeholder="Enter your phone number"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button
                  onClick={requestOtp}
                  disabled={loading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  Get OTP
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: OTP Verification */}
        {step === 2 && (
          <div className="max-w-md mx-auto">
            <div className="backdrop-blur bg-white/95 rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <KeyRound className="w-7 h-7 text-indigo-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Verify OTP</h2>
                <p className="text-gray-500 text-sm mt-1">Enter the 6-digit code</p>
              </div>

              {displayOtp && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                  <p className="text-xs text-amber-600 mb-1">Demo mode — your OTP is:</p>
                  <p className="text-2xl font-mono font-bold text-amber-700 tracking-widest">{displayOtp}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">OTP Code</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={e => e.key === 'Enter' && verifyOtp()}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-center text-xl tracking-widest font-mono"
                  />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button
                  onClick={verifyOtp}
                  disabled={loading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Verify
                </button>
                <button
                  onClick={() => { setStep(1); setOtp(''); setDisplayOtp(''); setError(''); }}
                  className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm"
                >
                  Use a different number
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Dashboard */}
        {step === 3 && data && (
          <div className="space-y-6">
            {/* Candidate Info */}
            <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 rounded-xl shadow-sm p-6 text-white">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
              <div className="relative flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                    <User className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{data.candidate.full_name}</h2>
                    <div className="flex flex-wrap gap-3 mt-1 text-sm text-white/80">
                      {data.candidate.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" /> {data.candidate.phone}
                        </span>
                      )}
                      {data.candidate.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" /> {data.candidate.email}
                        </span>
                      )}
                      {(data.candidate.current_city || data.candidate.current_state) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {[data.candidate.current_city, data.candidate.current_state].filter(Boolean).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => { setStep(1); setPhone(''); setOtp(''); setData(null); setError(''); setDisplayOtp(''); }}
                  className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors shrink-0"
                  title="Logout"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Applications */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2.5">
                <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                  <Briefcase className="w-[18px] h-[18px]" />
                </span>
                Your Applications
              </h3>
              {data.applications?.length ? (
                <div className="space-y-4">
                  {data.applications.map((app, idx) => {
                    const accent = APP_ACCENTS[idx % APP_ACCENTS.length];
                    return (
                    <div key={app.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex">
                      <div className={`w-1.5 shrink-0 ${accent}`} />
                      <div className="p-6 flex-1 min-w-0">
                        <div className="flex items-start justify-between flex-wrap gap-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">{app.vacancy_title}</h4>
                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                              {app.department_name && <span>{app.department_name}</span>}
                              {app.subject && <span>({app.subject})</span>}
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${STAGE_COLORS[app.current_stage] || 'bg-gray-100 text-gray-600'}`}>
                            {stageLabel(app.current_stage)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          Applied: {new Date(app.applied_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                        <StageProgress currentStage={app.current_stage} />
                      </div>
                    </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center mx-auto mb-3 text-white shadow-sm">
                    <FileText className="w-7 h-7" />
                  </div>
                  <p>No applications found</p>
                </div>
              )}
            </div>

            {/* Upload Documents */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2.5">
                <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-50 text-cyan-600 shrink-0">
                  <Upload className="w-[18px] h-[18px]" />
                </span>
                Upload Documents
              </h3>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                    dragOver
                      ? 'border-cyan-500 bg-cyan-100'
                      : 'border-cyan-200 bg-gradient-to-br from-cyan-50/70 to-blue-50/70 hover:border-cyan-400'
                  }`}
                >
                  {uploading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mx-auto" />
                  ) : (
                    <>
                      <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-sm mx-auto mb-3">
                        <Upload className="w-6 h-6" />
                      </span>
                      <p className="text-gray-700 text-sm font-medium">Drag &amp; drop a file here, or</p>
                      <label className="mt-2 inline-block px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-medium rounded-lg cursor-pointer hover:from-cyan-700 hover:to-blue-700 transition-all">
                        Browse Files
                        <input
                          type="file"
                          className="hidden"
                          onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); e.target.value = ''; }}
                        />
                      </label>
                      <p className="text-xs text-gray-500 mt-2">Max file size: 10 MB</p>
                    </>
                  )}
                </div>
                {uploadSuccess && (
                  <p className="mt-3 text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> {uploadSuccess}
                  </p>
                )}
                {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

                {data.documents?.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Uploaded Documents</p>
                    <div className="space-y-2">
                      {data.documents.map(doc => (
                        <div key={doc.id} className="flex items-center gap-2 text-sm text-gray-700 bg-cyan-50/60 border border-cyan-100 rounded-lg px-3 py-2">
                          <FileText className="w-4 h-4 text-cyan-600 shrink-0" />
                          <span className="truncate">{doc.file_name}</span>
                          <span className="text-xs text-cyan-700 bg-cyan-100 rounded-full px-2 py-0.5 ml-auto shrink-0">{doc.doc_type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-gray-400">
        {schoolName} Recruitment Portal
      </footer>
    </div>
  );
}
