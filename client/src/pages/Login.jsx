import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useBranding } from '../context/BrandingContext.jsx';
import SchoolLogo from '../components/SchoolLogo.jsx';
import { LogIn } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { schoolName, schoolShort } = useBranding();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 p-4">
      <div className="w-full max-w-md backdrop-blur-xl bg-white/95 rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <SchoolLogo size={64} rounded="rounded-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{schoolName}</h1>
          <p className="text-gray-500 mt-1">Recruitment Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="admin@amworld.in" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="Enter password" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg font-medium hover:from-blue-700 hover:to-cyan-600 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
            <LogIn size={18} />
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <div className="flex items-center justify-between text-sm">
            <Link to="/forgot-password" className="text-blue-600 hover:underline">Forgot Password?</Link>
            <Link to="/careers" className="text-gray-500 hover:text-gray-700">View Open Positions</Link>
          </div>
          <div className="text-center mt-2">
            <Link to="/portal" className="text-sm text-gray-400 hover:text-blue-600">Candidate Portal (Check Application Status)</Link>
          </div>
        </form>
      </div>
      <p className="text-center text-white/60 text-sm mt-6">Powered by Sarvagya Solutions</p>
    </div>
  );
}
