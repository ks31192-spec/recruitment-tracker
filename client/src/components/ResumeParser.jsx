import { useState, useRef } from 'react';
import api from '../lib/api.js';
import { Upload, FileText, Check, User, Phone, Mail, Loader } from 'lucide-react';

export default function ResumeParser({ onParsed }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState('');
  const inputRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    setLoading(true);
    setError('');
    setParsed(null);
    try {
      const fd = new FormData();
      fd.append('resume', file);
      const { data } = await api.post('/candidates/parse-resume', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setParsed(data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to parse resume');
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  const onPickFile = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const useData = () => {
    if (!parsed) return;
    onParsed?.({
      name: parsed.name || '',
      phone: parsed.phone || '',
      email: parsed.email || '',
      qualifications: parsed.qualifications || [],
    });
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}>
        <input ref={inputRef} type="file" accept=".txt,.pdf,.doc,.docx" onChange={onPickFile} className="hidden" />
        {loading ? (
          <div className="flex flex-col items-center gap-2 text-gray-500">
            <Loader size={28} className="animate-spin text-blue-500" />
            <p className="text-sm">Parsing resume...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-500">
            <Upload size={28} />
            <p className="text-sm font-medium">Drop resume here or click to upload</p>
            <p className="text-xs text-gray-400">.txt, .pdf, .doc, .docx</p>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Parsed results */}
      {parsed && (
        <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
            <FileText size={16} className="text-blue-600" />
            Parsed Results
          </div>

          <div className="space-y-2 text-sm">
            {parsed.name && (
              <div className="flex items-center gap-2">
                <User size={14} className="text-gray-400" />
                <span className="font-medium text-gray-700">Name:</span>
                <span className="text-gray-900">{parsed.name}</span>
              </div>
            )}
            {parsed.phone && (
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-gray-400" />
                <span className="font-medium text-gray-700">Phone:</span>
                <span className="text-gray-900">{parsed.phone}</span>
              </div>
            )}
            {parsed.email && (
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-gray-400" />
                <span className="font-medium text-gray-700">Email:</span>
                <span className="text-gray-900">{parsed.email}</span>
              </div>
            )}
          </div>

          {parsed.qualifications?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Qualifications Found</p>
              <div className="flex flex-wrap gap-1">
                {parsed.qualifications.map((q, i) => (
                  <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    {q}
                  </span>
                ))}
              </div>
            </div>
          )}

          {parsed.message && (
            <p className="text-xs text-amber-600">{parsed.message}</p>
          )}

          <button type="button" onClick={useData}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            <Check size={14} />
            Use this data
          </button>
        </div>
      )}
    </div>
  );
}
