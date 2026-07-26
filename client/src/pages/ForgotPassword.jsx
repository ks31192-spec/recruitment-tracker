import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Mail, Key, CheckCircle } from 'lucide-react';
import PasswordInput from '../components/PasswordInput.jsx';
import { validatePassword, PASSWORD_RULE } from '../lib/password.js';

export default function ForgotPassword() {
  // The reset email links to /reset-password?token=..., so skip straight to
  // the new-password step when we arrive that way.
  const [params] = useSearchParams();
  const urlToken = params.get('token') || '';

  const [step, setStep] = useState(urlToken ? 'token' : 'email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState(urlToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await axios.post('/api/auth/forgot-password', { email });
      setStep('token');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed');
    } finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirm) { setError('Passwords do not match'); return; }
    const pwError = validatePassword(newPassword);
    if (pwError) { setError(pwError); return; }
    setLoading(true);
    setError('');
    try {
      await axios.post('/api/auth/reset-password', { token, new_password: newPassword });
      setStep('done');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 flex items-center justify-center p-4">
      <div className="backdrop-blur-xl bg-white/95 rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <Link to="/login" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={16} /> Back to Login
        </Link>

        {step === 'email' && (
          <form onSubmit={handleRequestReset}>
            <div className="text-center mb-6">
              <Mail className="mx-auto text-blue-600 mb-3" size={40} />
              <h2 className="text-xl font-bold text-gray-900">Forgot Password</h2>
              <p className="text-sm text-gray-500 mt-1">Enter your email to receive a reset token</p>
            </div>
            {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">{error}</div>}
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Your email address"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-4" />
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium">
              {loading ? 'Sending...' : 'Send Reset Token'}
            </button>
          </form>
        )}

        {step === 'token' && (
          <form onSubmit={handleResetPassword}>
            <div className="text-center mb-6">
              <Key className="mx-auto text-blue-600 mb-3" size={40} />
              <h2 className="text-xl font-bold text-gray-900">Reset Password</h2>
              <p className="text-sm text-gray-500 mt-1">
                {urlToken
                  ? 'Choose a new password for your account.'
                  : 'If that email is registered, a reset token is on its way. Paste it below with your new password.'}
              </p>
            </div>
            {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">{error}</div>}
            {!urlToken && (
              <input value={token} onChange={e => setToken(e.target.value)} required placeholder="Reset token"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-3" />
            )}
            <PasswordInput value={newPassword} onChange={e => setNewPassword(e.target.value)} required placeholder="New password"
              wrapperClassName="mb-3"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            <PasswordInput value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="Confirm new password"
              wrapperClassName="mb-2"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            <p className="text-xs text-gray-400 mb-4">{PASSWORD_RULE}</p>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium">
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        {step === 'done' && (
          <div className="text-center">
            <CheckCircle className="mx-auto text-green-500 mb-4" size={56} />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Password Reset!</h2>
            <p className="text-gray-600 mb-6">Your password has been changed successfully.</p>
            <Link to="/login" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
              Go to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
