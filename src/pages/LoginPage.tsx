import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bug, Loader2 } from 'lucide-react';
import { useIssueAuth } from '../contexts/IssueAuthContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: { theme?: string; size?: string; text?: string; width?: string }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

function decodeJWT(token: string): { email: string; name: string; picture?: string; sub: string } | null {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const { login } = useIssueAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
      if (window.google) setGoogleReady(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleReady(true);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!googleReady || !googleButtonRef.current || !GOOGLE_CLIENT_ID) return;
    try {
      window.google!.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response: { credential: string }) => {
          const info = decodeJWT(response.credential);
          if (info) {
            login(info.email, info.name);
            navigate('/issues/report');
          }
        },
        auto_select: false,
        cancel_on_tap_outside: false,
      });
      window.google!.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        width: '320',
      });
    } catch {}
  }, [googleReady, login, navigate]);

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    login(email, name || undefined);
    navigate('/issues/report');
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

        {GOOGLE_CLIENT_ID && (
          <>
            <div className="flex justify-center" ref={googleButtonRef}>
              {!googleReady && <Loader2 size={20} className="animate-spin text-gray-400" />}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs font-semibold text-gray-400">or continue with email</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
          </>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
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
            Sign In
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center leading-relaxed">
          {GOOGLE_CLIENT_ID
            ? 'Sign in with your Google Workspace account or use your email above.'
            : 'Enter your work email to get started. A team member will verify your access.'}
        </p>
      </div>
    </div>
  );
}
