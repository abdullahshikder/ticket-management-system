import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, Filter, ChevronDown, Download, Clock, FileText,
  CheckSquare, RotateCcw, MoreHorizontal, User
} from 'lucide-react';
import { issueService } from '../../services/issueService';
import type { TicketListItem, FormConfig } from '../../types/issues';

type Filters = {
  search: string;
  status: string;
  priority: string;
  product_area: string;
  feature: string;
  owner: string;
  date_from: string;
  date_to: string;
  unassigned: string;
};

export default function IssueDashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<FormConfig | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const limit = 25;

  const [filters, setFilters] = useState<Filters>(() => ({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
    priority: searchParams.get('priority') || '',
    product_area: searchParams.get('product_area') || '',
    feature: searchParams.get('feature') || '',
    owner: searchParams.get('owner') || '',
    date_from: searchParams.get('date_from') || '',
    date_to: searchParams.get('date_to') || '',
    unassigned: searchParams.get('unassigned') || '',
  }));

  useEffect(() => {
    issueService.getFormConfig().then(setConfig).catch(() => {});
  }, []);

  useEffect(() => {
    loadTickets();
  }, [page, filters]);

  useEffect(() => {
    const params = new URLSearchParams();
    (Object.keys(filters) as (keyof Filters)[]).forEach(k => { const v = filters[k]; if (v) params.set(k, v); });
    setSearchParams(params.toString(), { replace: true });
  }, [filters, setSearchParams]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit };
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.product_area) params.product_area = filters.product_area;
      if (filters.feature) params.feature = filters.feature;
      if (filters.owner) params.owner = filters.owner;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      if (filters.unassigned) params.unassigned = 'true';

      const res = await issueService.getAdminTickets(params);
      setTickets(res.tickets);
      setTotal(res.total);
    } catch {}
    setLoading(false);
  };

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
    setSelected(new Set());
  };

  const debouncedSearch = useCallback(() => {
    const timer = setTimeout(() => {
      if (filters.search !== undefined) loadTickets();
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => { debouncedSearch(); }, [debouncedSearch]);

  const totalPages = Math.ceil(total / limit);

  const handleBulkAction = async (action: string) => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    if (action === 'export-selected') {
      window.open('/api/admin/tickets/export', '_blank');
      return;
    }
  };

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Issue Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total tickets</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleBulkAction as any}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={filters.search} onChange={e => updateFilter('search', e.target.value)}
                placeholder="Search tickets by ID, title, or description..."
                className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e83330]/20 focus:border-[#e83330]" />
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                showFilters ? 'bg-[#e83330] text-white border-[#e83330]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              <Filter size={14} /> Filters
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-gray-100">
              <select value={filters.status} onChange={e => updateFilter('status', e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#e83330]/20 cursor-pointer">
                <option value="">All Statuses</option>
                {config?.statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select value={filters.priority} onChange={e => updateFilter('priority', e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#e83330]/20 cursor-pointer">
                <option value="">All Priorities</option>
                {config?.priorities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={filters.product_area} onChange={e => updateFilter('product_area', e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#e83330]/20 cursor-pointer">
                <option value="">All Areas</option>
                {config?.areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <div className="flex gap-2">
                <input type="date" value={filters.date_from} onChange={e => updateFilter('date_from', e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#e83330]/20" placeholder="From" />
                <input type="date" value={filters.date_to} onChange={e => updateFilter('date_to', e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#e83330]/20" placeholder="To" />
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="h-12 bg-gray-50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-bold text-gray-500">No tickets found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="w-8 px-3 py-3">
                    <input type="checkbox" onChange={e => {
                      if (e.target.checked) setSelected(new Set(tickets.map(t => t.id)));
                      else setSelected(new Set());
                    }} className="rounded cursor-pointer" />
                  </th>
                  <th className="text-left px-3 py-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Ticket</th>
                  <th className="text-left px-3 py-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="text-left px-3 py-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-3 py-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="text-left px-3 py-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Area</th>
                  <th className="text-left px-3 py-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Reporter</th>
                  <th className="text-left px-3 py-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Assignee</th>
                  <th className="text-left px-3 py-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="text-left px-3 py-3 text-[10px] font-black text-gray-500 uppercase tracking-wider">Age</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(ticket => (
                  <tr key={ticket.id} onClick={() => navigate(`/issues/admin/${ticket.id}`)}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer">
                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(ticket.id)} onChange={() => {
                        const next = new Set(selected);
                        if (next.has(ticket.id)) next.delete(ticket.id); else next.add(ticket.id);
                        setSelected(next);
                      }} className="rounded cursor-pointer" />
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-mono font-bold text-xs text-gray-500">{ticket.ticket_number}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-semibold text-gray-800 text-xs truncate max-w-[200px] block">{ticket.title}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold`}
                        style={{ backgroundColor: ticket.status_colour + '20', color: ticket.status_colour }}>
                        {ticket.status_name}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {ticket.priority_name && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold`}
                          style={{ backgroundColor: ticket.priority_colour + '15', color: ticket.priority_colour }}>
                          {ticket.priority_name}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600">{ticket.product_area_name || '-'}</td>
                    <td className="px-3 py-3 text-xs text-gray-600">{ticket.reporter_name || '-'}</td>
                    <td className="px-3 py-3 text-xs text-gray-600">{ticket.assignee_name || '-'}</td>
                    <td className="px-3 py-3 text-xs text-gray-500">{new Date(ticket.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-bold ${ticket.age_days > 7 ? 'text-red-500' : ticket.age_days > 3 ? 'text-amber-500' : 'text-gray-500'}`}>
                        {Math.round(ticket.age_days)}d
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <span className="text-xs text-gray-500">{total} tickets</span>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(totalPages, 8) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded text-xs font-bold transition-colors cursor-pointer ${
                    p === page ? 'bg-[#e83330] text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}>{p}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
