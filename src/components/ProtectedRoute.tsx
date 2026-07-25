import { Navigate, Outlet } from 'react-router-dom';
import { useIssueAuth } from '../contexts/IssueAuthContext';

export default function ProtectedRoute() {
  const { isAuthenticated } = useIssueAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
