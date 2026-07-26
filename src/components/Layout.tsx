import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Bug, TicketCheck, Settings2, Shield, BarChart3, Users,
  PlusCircle, LogOut, ChevronDown, HelpCircle
} from 'lucide-react';
import { useIssueAuth } from '../contexts/IssueAuthContext';

const navItems = [
  { path: '/issues/report', label: 'Report Issue', icon: <PlusCircle size={18} />, badge: 'New' },
  { path: '/issues/my', label: 'My Tickets', icon: <TicketCheck size={18} /> },
  { type: 'separator' },
  { path: '/issues/admin', label: 'Issue Dashboard', icon: <Settings2 size={18} />, badge: 'Internal' },
  { path: '/issues/admin/config', label: 'Form Config', icon: <Shield size={18} /> },
  { path: '/issues/admin/analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
  { path: '/issues/admin/users', label: 'Users', icon: <Users size={18} /> },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useIssueAuth();

  return (
    <div className="flex h-screen bg-[#f8fafc] text-[#111827] font-sans antialiased overflow-hidden">
      <aside className="w-64 bg-white border-r border-[#eaecf0] flex flex-col h-full shrink-0 shadow-sm relative z-30">
        <div className="p-5 border-b border-[#f2f4f7]">
          <h1 className="text-lg font-black text-gray-900">Ticket System</h1>
          <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Issue Management</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item: any) => {
            if (item.type === 'separator') {
              return <div key={`sep-${Math.random()}`} className="h-px bg-gray-100 my-2" />;
            }
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all cursor-pointer ${
                  location.pathname === item.path || (item.path !== '/issues/report' && location.pathname.startsWith(item.path))
                    ? 'bg-red-50 text-[#e83330] font-bold'
                    : 'text-[#5b667a] hover:bg-gray-50 hover:text-[#111827] font-semibold'
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="flex-1 text-xs font-semibold">{item.label}</span>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[8px] font-black rounded uppercase tracking-wider bg-[#e83330] text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {user && (
          <div className="p-4 border-t border-[#f2f4f7] bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#e83330] text-white flex items-center justify-center font-bold text-sm">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-gray-900 truncate">{user.full_name}</div>
                <div className="text-[10px] text-gray-500 truncate">{user.email}</div>
              </div>
              <button onClick={() => { logout(); navigate('/login'); }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer" title="Log out">
                <LogOut size={14} />
              </button>
            </div>
            <div className="mt-2 flex items-center gap-1">
              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider bg-gray-200 text-gray-600">
                {user.role}
              </span>
              <span className="text-[10px] text-gray-400">{user.team}</span>
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-[#eaecf0] flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <Bug size={16} className="text-[#e83330]" />
            <span className="text-sm font-bold text-gray-700">
              {location.pathname === '/issues/report' ? 'Report an Issue' :
               location.pathname === '/issues/my' ? 'My Tickets' :
               location.pathname.startsWith('/issues/admin') ? 'Admin Dashboard' : 'Ticket System'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/issues/report')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e83330] text-white rounded-lg text-xs font-bold hover:bg-[#c82e2c] transition-colors cursor-pointer">
              <PlusCircle size={13} /> New Issue
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 bg-[#f8fafc]">
          <div className="mx-auto" style={{ maxWidth: '1200px' }}>
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
