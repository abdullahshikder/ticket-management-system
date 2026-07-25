import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Clock, ChevronRight, Filter, ExternalLink } from 'lucide-react';
import { issueService } from '../../services/issueService';
import type { Ticket } from '../../types/issues';

export default function MyIssuesPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const limit = 20;

  useEffect(() => {
    loadTickets();
  }, [page, search]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await issueService.getMyTickets(page, limit, search);
      setTickets(res.tickets as unknown as Ticket[]);
      setTotal(res.total);
    } catch {}
    setLoading(false);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-4xl mx-auto py-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">My Issues</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage your reported issues.</p>
        </div>
        <button onClick={() => navigate('/issues/report')}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#e83330] text-white rounded-lg text-sm font-bold hover:bg-[#c82e2c] transition-all cursor-pointer shadow-sm">
          <Plus size={16} /> Report Issue
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search your issues..."
          className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#e83330]/20 focus:border-[#e83330]" />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-50 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <ExternalLink size={28} className="text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-700 mb-1">No issues reported yet</h3>
          <p className="text-sm text-gray-400 mb-4">When you report an issue, it will appear here.</p>
          <button onClick={() => navigate('/issues/report')}
            className="px-4 py-2 bg-[#e83330] text-white rounded-lg text-sm font-bold hover:bg-[#c82e2c] transition-colors cursor-pointer">
            Report Your First Issue
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {tickets.map(ticket => (
              <div key={ticket.id} onClick={() => navigate(`/issues/${ticket.id}`)}
                className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-mono font-bold text-gray-400">{ticket.ticket_number}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold`}
                        style={{ backgroundColor: (ticket as any).status_colour + '20', color: (ticket as any).status_colour }}>
                        {(ticket as any).status_name}
                      </span>
                      {(ticket as any).priority_name && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold`}
                          style={{ backgroundColor: (ticket as any).priority_colour + '15', color: (ticket as any).priority_colour }}>
                          {(ticket as any).priority_name}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 truncate">{ticket.title}</h3>
                    {(ticket as any).product_area_name && (
                      <p className="text-xs text-gray-500 mt-0.5">{(ticket as any).product_area_name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={12} />
                        <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-gray-500">{total} issue(s)</span>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      p === page ? 'bg-[#e83330] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}>{p}</button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
