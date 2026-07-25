import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Clock, User, MessageSquare, Send, Paperclip, Download,
  FileText, Image, Film, CheckCircle2, RotateCcw, AlertTriangle,
  Flag, Link2, Copy, Eye, EyeOff, History, X, ChevronDown
} from 'lucide-react';
import { issueService } from '../../services/issueService';
import type { Ticket, TicketComment, Status, Priority, IssueUser } from '../../types/issues';

const EVENT_ICONS: Record<string, string> = {
  created: '🎫',
  status_changed: '🔄',
  priority_changed: '⚡',
  assigned: '👤',
  comment_added: '💬',
  attachment_added: '📎',
  marked_duplicate: '🔗',
  reopened: '🔓',
  bulk_updated: '📝',
};

export default function AdminTicketDetailPage() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [commentVisibility, setCommentVisibility] = useState<'internal' | 'reporter'>('internal');
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [users, setUsers] = useState<IssueUser[]>([]);

  useEffect(() => {
    if (ticketId) loadTicket();
    Promise.all([
      issueService.getFormConfig().then(c => { setStatuses(c.statuses); setPriorities(c.priorities); }),
      issueService.getUsers().then(r => setUsers(r.users as IssueUser[])),
    ]).catch(() => {});
  }, [ticketId]);

  const loadTicket = async () => {
    try {
      const res = await issueService.getAdminTicket(ticketId!);
      setTicket(res.ticket);
    } catch {}
    setLoading(false);
  };

  const addComment = async () => {
    if (!commentText.trim() || !ticket) return;
    try {
      await issueService.addComment(ticket.id, commentText, commentVisibility);
      setCommentText('');
      loadTicket();
    } catch {}
  };

  const changeStatus = async (statusId: string) => {
    if (!ticket) return;
    await issueService.changeStatus(ticket.id, statusId);
    loadTicket();
  };

  const changePriority = async (priorityId: string) => {
    if (!ticket) return;
    await issueService.changePriority(ticket.id, priorityId);
    loadTicket();
  };

  const assignUser = async (userId: string) => {
    if (!ticket) return;
    await issueService.assignTicket(ticket.id, userId);
    loadTicket();
  };

  const reopenTicket = async () => {
    if (!ticket) return;
    await issueService.reopenTicket(ticket.id);
    loadTicket();
  };

  if (loading) return (
    <div className="max-w-6xl mx-auto py-4">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-100 rounded w-1/4" />
        <div className="h-48 bg-gray-50 rounded-xl" />
      </div>
    </div>
  );

  if (!ticket) return (
    <div className="max-w-6xl mx-auto py-4 text-center">
      <p className="text-gray-500">Ticket not found.</p>
      <button onClick={() => navigate('/issues/admin')} className="text-[#e83330] font-bold cursor-pointer">Back to Dashboard</button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto py-4">
      <button onClick={() => navigate('/issues/admin')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4 font-semibold cursor-pointer">
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-mono font-black text-gray-400">{ticket.ticket_number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold`}
                      style={{ backgroundColor: ticket.status_colour + '20', color: ticket.status_colour }}>
                      {ticket.status_name}
                    </span>
                    {ticket.priority_name && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold`}
                        style={{ backgroundColor: ticket.priority_colour + '15', color: ticket.priority_colour }}>
                        {ticket.priority_name}
                      </span>
                    )}
                  </div>
                  <h1 className="text-xl font-black text-gray-900">{ticket.title}</h1>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Clock size={12} /> {new Date(ticket.created_at).toLocaleString()}</span>
                    <span className="flex items-center gap-1"><User size={12} /> {ticket.reporter_name || 'Unknown'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Product Area</span>
                  <p className="text-sm font-semibold">{ticket.product_area_name || '-'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Feature</span>
                  <p className="text-sm font-semibold">{ticket.feature_name || '-'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Issue Type</span>
                  <p className="text-sm font-semibold">{ticket.issue_type_name || '-'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Suggested Priority</span>
                  <p className="text-sm font-semibold">{ticket.suggested_priority_name || '-'}</p>
                </div>
              </div>

              {(ticket.description || ticket.expected_behaviour || ticket.actual_behaviour || ticket.business_impact) && (
                <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  {ticket.description && (
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Description</span>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
                    </div>
                  )}
                  {ticket.expected_behaviour && (
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Expected Behaviour</span>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.expected_behaviour}</p>
                    </div>
                  )}
                  {ticket.actual_behaviour && (
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Actual Behaviour</span>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.actual_behaviour}</p>
                    </div>
                  )}
                  {ticket.business_impact && (
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Business Impact</span>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.business_impact}</p>
                    </div>
                  )}
                </div>
              )}

              {ticket.merchant_name && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                  <User size={16} className="text-gray-400" />
                  <div>
                    <span className="text-xs font-bold text-gray-500 block">Merchant</span>
                    <span className="text-sm font-semibold">{ticket.merchant_name}</span>
                    {ticket.merchant_id && <span className="text-xs text-gray-400 ml-1">({ticket.merchant_id})</span>}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Platform</span>
                  <p className="text-sm font-semibold">{ticket.platform || '-'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Browser</span>
                  <p className="text-sm font-semibold">{ticket.browser || '-'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Device</span>
                  <p className="text-sm font-semibold">{ticket.device_type || '-'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">OS</span>
                  <p className="text-sm font-semibold">{ticket.operating_system || '-'}</p>
                </div>
              </div>

              {ticket.attachments && ticket.attachments.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                    <Paperclip size={12} /> Attachments ({ticket.attachments.length})
                  </span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {ticket.attachments.map(att => (
                      <div key={att.id}
                        className="p-2 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors cursor-pointer group"
                        onClick={() => {
                          if (att.mime_type.startsWith('image/')) {
                            setFullscreenImage(`/api/uploads/${att.storage_key}`);
                          } else {
                            window.open(`/api/uploads/${att.storage_key}`, '_blank');
                          }
                        }}>
                        <div className="w-full h-20 rounded-md bg-white border border-gray-100 flex items-center justify-center mb-1 overflow-hidden">
                          {att.mime_type.startsWith('image/') ? (
                            <img src={`/api/uploads/${att.storage_key}`} alt={att.original_file_name}
                              className="w-full h-full object-cover" />
                          ) : att.mime_type.startsWith('video/') ? (
                            <Film size={24} className="text-purple-400" />
                          ) : (
                            <FileText size={24} className="text-gray-400" />
                          )}
                        </div>
                        <p className="text-[10px] font-semibold text-gray-600 truncate">{att.original_file_name}</p>
                        <p className="text-[9px] text-gray-400">{(att.file_size / 1024).toFixed(0)} KB</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-black text-gray-500 uppercase flex items-center gap-1">
                <MessageSquare size={14} /> Comments & Updates
              </span>
              <span className="text-[10px] text-gray-400">{ticket.comments?.length || 0} total</span>
            </div>
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {(ticket.comments || []).length === 0 && (
                <p className="text-xs text-gray-400 italic text-center py-4">No comments yet.</p>
              )}
              {(ticket.comments || []).map(comment => (
                <div key={comment.id} className={`p-3 rounded-xl border ${comment.visibility === 'internal' ? 'bg-amber-50/50 border-amber-100' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-700">{comment.author_name || 'System'}</span>
                      {comment.visibility === 'internal' ? (
                        <span className="text-[9px] text-amber-600 font-bold flex items-center gap-0.5"><EyeOff size={10} /> Internal</span>
                      ) : (
                        <span className="text-[9px] text-blue-600 font-bold flex items-center gap-0.5"><Eye size={10} /> Visible to Reporter</span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400">{new Date(comment.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-100">
              <div className="flex gap-2 mb-2">
                <button onClick={() => setCommentVisibility('internal')}
                  className={`px-2 py-1 text-[10px] font-bold rounded cursor-pointer ${commentVisibility === 'internal' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-500'}`}>
                  <EyeOff size={10} className="inline" /> Internal Note
                </button>
                <button onClick={() => setCommentVisibility('reporter')}
                  className={`px-2 py-1 text-[10px] font-bold rounded cursor-pointer ${commentVisibility === 'reporter' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>
                  <Eye size={10} className="inline" /> Public Update
                </button>
              </div>
              <div className="flex gap-2">
                <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                  placeholder={commentVisibility === 'internal' ? 'Add internal note...' : 'Add public update...'}
                  rows={2}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e83330]/20 focus:border-[#e83330]" />
                <button onClick={addComment} disabled={!commentText.trim()}
                  className="px-4 py-2 bg-[#e83330] text-white rounded-lg text-sm font-bold hover:bg-[#c82e2c] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer self-end">
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <History size={14} className="text-gray-400" />
              <span className="text-xs font-black text-gray-500 uppercase">Timeline</span>
            </div>
            <div className="p-4 space-y-0 max-h-80 overflow-y-auto">
              {(ticket.history || []).length === 0 && (
                <p className="text-xs text-gray-400 italic text-center py-4">No history recorded.</p>
              )}
              {(ticket.history || []).map((h, i) => (
                <div key={h.id} className="flex gap-3 pb-4 relative">
                  {i < (ticket.history?.length || 0) - 1 && (
                    <div className="absolute left-3 top-6 bottom-0 w-px bg-gray-200" />
                  )}
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-xs">
                    {EVENT_ICONS[h.event_type] || '📋'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-700">{h.actor_name || 'System'}</span>
                      <span className="text-[10px] text-gray-400">{new Date(h.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {h.event_type === 'created' && `Created ticket`}
                      {h.event_type === 'status_changed' && `Changed status`}
                      {h.event_type === 'priority_changed' && `Changed priority`}
                      {h.event_type === 'assigned' && `Assigned to ${h.new_value ? users.find(u => u.id === h.new_value)?.full_name || h.new_value : 'Unassigned'}`}
                      {h.event_type === 'comment_added' && `Added ${h.new_value === 'reporter' ? 'public' : 'internal'} comment`}
                      {h.event_type === 'attachment_added' && `Added attachment: ${h.new_value}`}
                      {h.event_type === 'marked_duplicate' && `Marked as duplicate`}
                      {h.event_type === 'reopened' && `Reopened ticket`}
                      {h.event_type === 'bulk_updated' && `Updated via bulk action`}
                      {h.event_type.endsWith('_changed') && `Updated ${h.event_type.replace('_changed', '')}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <span className="text-xs font-black text-gray-500 uppercase">Actions</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Status</label>
                <select value={ticket.status_id} onChange={e => changeStatus(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#e83330]/20 cursor-pointer">
                  {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Priority</label>
                <select value={ticket.priority_id || ''} onChange={e => changePriority(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#e83330]/20 cursor-pointer">
                  <option value="">No priority</option>
                  {priorities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Assign To</label>
                <select value={ticket.assigned_to || ''} onChange={e => assignUser(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#e83330]/20 cursor-pointer">
                  <option value="">Unassigned</option>
                  {users.filter(u => u.role === 'internal' || u.role === 'admin').map(u => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>
              <hr className="border-gray-100" />
              {(ticket.status_id === 'st-resolved' || ticket.status_id === 'st-closed') && (
                <button onClick={reopenTicket}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-orange-200 text-orange-700 rounded-lg text-xs font-bold hover:bg-orange-50 transition-colors cursor-pointer">
                  <RotateCcw size={14} /> Reopen Ticket
                </button>
              )}
              <button onClick={() => {
                navigator.clipboard.writeText(window.location.href);
              }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors cursor-pointer">
                <Copy size={14} /> Copy Link
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <span className="text-xs font-black text-gray-500 uppercase">Reporter</span>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <div>
                <span className="text-[10px] font-bold text-gray-500 block">Name</span>
                <span className="font-semibold">{ticket.reporter_name || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 block">Email</span>
                <span className="font-semibold">{ticket.reporter_email || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 block">Team</span>
                <span className="font-semibold">{ticket.reporter_team || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 block">Phone</span>
                <span className="font-semibold">{ticket.reporter_phone || '-'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {fullscreenImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setFullscreenImage(null)}>
          <img src={fullscreenImage} alt="Fullscreen" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
