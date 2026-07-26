import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bug, Loader2 } from 'lucide-react';
import { useIssueAuth } from '../contexts/IssueAuthContext';

export default function LoginPage() {
  const { login } = useIssueAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, name || undefined);
      navigate('/issues/report');
    } catch {
      setError('Failed to sign in. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-[#e83330] rounded-xl flex items-center justify-center mx-auto">
            <Bug size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-black text-gray-900">Ticket System</h1>
          <p className="text-sm text-gray-500">Sign in to report and track issues</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700">Work email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#e83330]/20 focus:border-[#e83330]" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700">Full name <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Your name"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#e83330]/20 focus:border-[#e83330]" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-[#e83330] text-white rounded-lg text-sm font-bold hover:bg-[#c82e2c] disabled:opacity-50 transition-colors cursor-pointer flex items-center justify-center gap-2">
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center leading-relaxed">
          Sign in with your work email. Returning users are recognised automatically.
        </p>
      </div>
    </div>
  );
}
