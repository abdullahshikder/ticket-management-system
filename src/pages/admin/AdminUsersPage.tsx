import { useState, useEffect } from 'react';
import {
  Plus, Save, Trash2, Edit2, X, CheckCircle2, XCircle,
  User, Shield, Eye
} from 'lucide-react';
import { issueService } from '../../services/issueService';
import type { IssueUser } from '../../types/issues';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<(IssueUser & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ full_name: '', email: '', phone: '', team: '', role: 'reporter' });

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await issueService.getAdminUsers();
      setUsers(res.users as any);
    } catch {}
    setLoading(false);
  };

  const startEdit = (user: any) => {
    setEditing(user.id);
    setEditForm({ full_name: user.full_name, email: user.email, phone: user.phone || '', team: user.team || '', role: user.role, status: user.status });
  };

  const saveEdit = async () => {
    if (!editing) return;
    await issueService.updateUser(editing, editForm);
    setEditing(null);
    loadUsers();
  };

  const handleCreate = async () => {
    await issueService.createUser(createForm);
    setShowCreate(false);
    setCreateForm({ full_name: '', email: '', phone: '', team: '', role: 'reporter' });
    loadUsers();
  };

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage issue system users and permissions.</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#e83330] text-white rounded-lg text-xs font-bold hover:bg-[#c82e2c] transition-colors cursor-pointer">
          <Plus size={14} /> Add User
        </button>
      </div>

      {showCreate && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <input value={createForm.full_name} onChange={e => setCreateForm(p => ({ ...p, full_name: e.target.value }))}
              placeholder="Full Name" className="border border-blue-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300" />
            <input value={createForm.email} onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))}
              placeholder="Email" className="border border-blue-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300" />
            <input value={createForm.phone} onChange={e => setCreateForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="Phone" className="border border-blue-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300" />
            <input value={createForm.team} onChange={e => setCreateForm(p => ({ ...p, team: e.target.value }))}
              placeholder="Team" className="border border-blue-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300" />
            <select value={createForm.role} onChange={e => setCreateForm(p => ({ ...p, role: e.target.value }))}
              className="border border-blue-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-300 cursor-pointer">
              <option value="reporter">Reporter</option>
              <option value="internal">Internal</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setShowCreate(false)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer">Cancel</button>
            <button onClick={handleCreate}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 cursor-pointer">Create</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-50 rounded-lg animate-pulse" />)}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-[10px] font-black text-gray-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-[10px] font-black text-gray-500 uppercase">Email</th>
                <th className="text-left px-4 py-3 text-[10px] font-black text-gray-500 uppercase">Team</th>
                <th className="text-left px-4 py-3 text-[10px] font-black text-gray-500 uppercase">Role</th>
                <th className="text-left px-4 py-3 text-[10px] font-black text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-[10px] font-black text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    {editing === user.id ? (
                      <input value={editForm.full_name || ''} onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))}
                        className="border border-gray-200 rounded px-2 py-1 text-xs w-full" />
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#e83330]/10 text-[#e83330] flex items-center justify-center text-xs font-bold">
                          {user.full_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-gray-700 block">{user.full_name || 'Unknown'}</span>
                          {user.phone && <span className="text-[10px] text-gray-400">{user.phone}</span>}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editing === user.id ? (
                      <input value={editForm.email || ''} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                        className="border border-gray-200 rounded px-2 py-1 text-xs w-full" />
                    ) : (
                      <span className="text-xs text-gray-600">{user.email}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editing === user.id ? (
                      <input value={editForm.team || ''} onChange={e => setEditForm(p => ({ ...p, team: e.target.value }))}
                        className="border border-gray-200 rounded px-2 py-1 text-xs w-full" />
                    ) : (
                      <span className="text-xs text-gray-600">{user.team || '-'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editing === user.id ? (
                      <select value={editForm.role || 'reporter'} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}
                        className="border border-gray-200 rounded px-2 py-1 text-xs bg-white cursor-pointer">
                        <option value="reporter">Reporter</option>
                        <option value="internal">Internal</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        user.role === 'admin' ? 'bg-purple-50 text-purple-700' :
                        user.role === 'internal' ? 'bg-blue-50 text-blue-700' :
                        'bg-gray-50 text-gray-600'
                      }`}>{user.role}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editing === user.id ? (
                      <select value={editForm.status || 'active'} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
                        className="border border-gray-200 rounded px-2 py-1 text-xs bg-white cursor-pointer">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    ) : (
                      <span className={`flex items-center gap-1 text-xs font-bold ${user.status === 'active' ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {user.status === 'active' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {user.status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editing === user.id ? (
                      <div className="flex justify-end gap-1">
                        <button onClick={saveEdit} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"><Save size={14} /></button>
                        <button onClick={() => setEditing(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded cursor-pointer"><X size={14} /></button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(user)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded cursor-pointer">
                        <Edit2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
