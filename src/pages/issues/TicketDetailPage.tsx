import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, User, MessageSquare, Send, Paperclip, Download, FileText, Image, Film } from 'lucide-react';
import { issueService } from '../../services/issueService';
import type { Ticket, TicketComment } from '../../types/issues';

export default function TicketDetailPage() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  useEffect(() => {
    if (ticketId) loadTicket();
  }, [ticketId]);

  const loadTicket = async () => {
    try {
      const res = await issueService.getTicket(ticketId!);
      setTicket(res.ticket);
    } catch {}
    setLoading(false);
  };

  const addComment = async () => {
    if (!commentText.trim() || !ticket) return;
    try {
      await issueService.addComment(ticket.id, commentText, 'reporter');
      setCommentText('');
      loadTicket();
    } catch {}
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto py-4">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-100 rounded w-1/3" />
        <div className="h-40 bg-gray-50 rounded-xl" />
        <div className="h-20 bg-gray-50 rounded-xl" />
      </div>
    </div>
  );

  if (!ticket) return (
    <div className="max-w-4xl mx-auto py-4 text-center">
      <p className="text-gray-500">Ticket not found.</p>
      <button onClick={() => navigate('/issues/my')} className="text-[#e83330] font-bold cursor-pointer">Back to My Issues</button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-4">
      <button onClick={() => navigate('/issues/my')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4 font-semibold cursor-pointer">
        <ArrowLeft size={16} /> Back to My Issues
      </button>

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
                <span className="flex items-center gap-1"><Clock size={12} /> Created {new Date(ticket.created_at).toLocaleString()}</span>
                <span className="flex items-center gap-1"><Clock size={12} /> Updated {new Date(ticket.updated_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-500 block">Product Area</span>
              <span className="text-sm font-semibold">{ticket.product_area_name || '-'}</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-500 block">Feature</span>
              <span className="text-sm font-semibold">{ticket.feature_name || '-'}</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-500 block">Issue Type</span>
              <span className="text-sm font-semibold">{ticket.issue_type_name || '-'}</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-500 block">Assigned To</span>
              <span className="text-sm font-semibold">{ticket.assignee_name || 'Unassigned'}</span>
            </div>
          </div>

          {(ticket.description || ticket.expected_behaviour || ticket.actual_behaviour) && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
              {ticket.description && (
                <div>
                  <span className="text-xs font-bold text-gray-500 block mb-1">Description</span>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
                </div>
              )}
              {ticket.expected_behaviour && (
                <div>
                  <span className="text-xs font-bold text-gray-500 block mb-1">Expected Behaviour</span>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.expected_behaviour}</p>
                </div>
              )}
              {ticket.actual_behaviour && (
                <div>
                  <span className="text-xs font-bold text-gray-500 block mb-1">Actual Behaviour</span>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.actual_behaviour}</p>
                </div>
              )}
              {ticket.business_impact && (
                <div>
                  <span className="text-xs font-bold text-gray-500 block mb-1">Business Impact</span>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.business_impact}</p>
                </div>
              )}
            </div>
          )}

          {ticket.merchant_name && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-xs font-bold text-gray-500 block mb-1">Merchant</span>
              <span className="text-sm font-semibold">{ticket.merchant_name}</span>
              {ticket.merchant_id && <span className="text-sm text-gray-400 ml-2">({ticket.merchant_id})</span>}
            </div>
          )}

          {ticket.attachments && ticket.attachments.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                <Paperclip size={12} /> Attachments ({ticket.attachments.length})
              </span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {ticket.attachments.map(att => (
                  <div key={att.id}
                    className="p-2 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors cursor-pointer"
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
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
              <MessageSquare size={12} /> Updates ({ticket.comments?.length || 0})
            </span>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {(ticket.comments || []).map(comment => (
                <div key={comment.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-gray-700">{comment.author_name || 'System'}</span>
                    <span className="text-[10px] text-gray-400">{new Date(comment.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                </div>
              ))}
              {(!ticket.comments || ticket.comments.length === 0) && (
                <p className="text-xs text-gray-400 italic">No updates yet.</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700">Add Update</label>
            <div className="flex gap-2">
              <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                placeholder="Share additional information..."
                rows={2}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e83330]/20 focus:border-[#e83330]" />
              <button onClick={addComment} disabled={!commentText.trim()}
                className="px-4 py-2 bg-[#e83330] text-white rounded-lg text-sm font-bold hover:bg-[#c82e2c] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer self-end">
                <Send size={16} />
              </button>
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
