import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { IssueAuthProvider } from './contexts/IssueAuthContext';
import App from './App';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';

import ReportIssuePage from './pages/issues/ReportIssuePage';
import MyIssuesPage from './pages/issues/MyIssuesPage';
import TicketDetailPage from './pages/issues/TicketDetailPage';
import IssueDashboardPage from './pages/admin/IssueDashboardPage';
import AdminTicketDetailPage from './pages/admin/AdminTicketDetailPage';
import FormConfigPage from './pages/admin/FormConfigPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminAnalyticsPage from './pages/admin/AnalyticsPage';

import './index.css';

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
