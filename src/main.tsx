import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { IssueAuthProvider, useIssueAuth } from './contexts/IssueAuthContext';
import App from './App';
import ProtectedRoute from './components/ProtectedRoute';

import ReportIssuePage from './pages/issues/ReportIssuePage';
import MyIssuesPage from './pages/issues/MyIssuesPage';
import TicketDetailPage from './pages/issues/TicketDetailPage';
import IssueDashboardPage from './pages/admin/IssueDashboardPage';
import AdminTicketDetailPage from './pages/admin/AdminTicketDetailPage';
import FormConfigPage from './pages/admin/FormConfigPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminAnalyticsPage from './pages/admin/AnalyticsPage';

import './index.css';

function LoginPage() {
  const { login } = useIssueAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, name || undefined);
    navigate('/issues/report');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 w-full max-w-sm space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-black text-gray-900">Ticket System</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to report and track issues</p>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-700">Email</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e83330]/20" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-700">Name <span className="text-gray-400 font-normal">(optional)</span></label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Your name"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e83330]/20" />
        </div>
        <button type="submit"
          className="w-full py-2.5 bg-[#e83330] text-white rounded-lg text-sm font-bold hover:bg-[#c82e2c] transition-colors cursor-pointer">
          Sign In
        </button>
      </form>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IssueAuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<App />}>
              <Route path="/issues/report" element={<ReportIssuePage />} />
              <Route path="/issues/my" element={<MyIssuesPage />} />
              <Route path="/issues/:ticketId" element={<TicketDetailPage />} />
              <Route path="/issues/admin" element={<IssueDashboardPage />} />
              <Route path="/issues/admin/:ticketId" element={<AdminTicketDetailPage />} />
              <Route path="/issues/admin/config" element={<FormConfigPage />} />
              <Route path="/issues/admin/users" element={<AdminUsersPage />} />
              <Route path="/issues/admin/analytics" element={<AdminAnalyticsPage />} />
              <Route path="*" element={<Navigate to="/issues/report" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </IssueAuthProvider>
  </StrictMode>
);
