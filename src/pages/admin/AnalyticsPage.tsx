import { useState, useEffect } from 'react';
import {
  BarChart3, TrendingUp, Clock, AlertTriangle, CheckCircle2,
  RotateCcw, Link2, Activity, Users, Target
} from 'lucide-react';
import { issueService } from '../../services/issueService';
import type { AnalyticsData } from '../../types/issues';

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    issueService.getAnalytics().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="py-4 space-y-4">
      <div className="h-8 bg-gray-100 rounded w-1/4 animate-pulse" />
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-50 rounded-xl animate-pulse" />)}
      </div>
    </div>
  );

  if (!data) return <div className="py-4 text-gray-500">Failed to load analytics.</div>;

  const cards = [
    { label: 'Total Issues', value: data.total, icon: <BarChart3 size={18} />, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Open Issues', value: data.open, icon: <Activity size={18} />, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Resolved', value: data.resolved, icon: <CheckCircle2 size={18} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Avg Resolution', value: `${data.avg_resolution_days}d`, icon: <Clock size={18} />, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Reopened', value: data.reopened_count, icon: <RotateCcw size={18} />, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Duplicates', value: data.duplicate_count, icon: <Link2 size={18} />, color: 'text-violet-600', bg: 'bg-violet-50' },
  ];

  const maxArea = Math.max(...data.by_area.map(a => a.count), 1);
  const maxPriority = Math.max(...data.by_priority.map(p => p.count), 1);

  return (
    <div className="py-4 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of issue reporting metrics.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className={`w-9 h-9 ${card.bg} rounded-lg flex items-center justify-center mb-3 ${card.color}`}>
              {card.icon}
            </div>
            <p className="text-2xl font-black text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-500 font-semibold mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-xs font-black text-gray-500 uppercase mb-4">Issues by Product Area</h3>
          <div className="space-y-2">
            {data.by_area.map(a => (
              <div key={a.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-gray-700">{a.name}</span>
                  <span className="font-bold text-gray-900">{a.count}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#e83330] rounded-full transition-all" style={{ width: `${(a.count / maxArea) * 100}%` }} />
                </div>
              </div>
            ))}
            {data.by_area.length === 0 && <p className="text-xs text-gray-400">No data</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-xs font-black text-gray-500 uppercase mb-4">Issues by Priority</h3>
          <div className="space-y-2">
            {data.by_priority.map(p => (
              <div key={p.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-gray-700">{p.name}</span>
                  <span className="font-bold text-gray-900">{p.count}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(p.count / maxPriority) * 100}%`, backgroundColor: p.colour }} />
                </div>
              </div>
            ))}
            {data.by_priority.length === 0 && <p className="text-xs text-gray-400">No data</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-xs font-black text-gray-500 uppercase mb-4">Issues by Status</h3>
          <div className="space-y-2">
            {data.by_status.map(s => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.colour }} />
                  <span className="font-semibold text-gray-700">{s.name}</span>
                </div>
                <span className="font-bold text-gray-900">{s.count}</span>
              </div>
            ))}
            {data.by_status.length === 0 && <p className="text-xs text-gray-400">No data</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-xs font-black text-gray-500 uppercase mb-4">Aging Open Tickets</h3>
          <div className="space-y-2">
            {data.aging_tickets.map((a: any) => (
              <div key={a.bucket} className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-700">{a.bucket}</span>
                <span className="font-bold text-gray-900">{a.count}</span>
              </div>
            ))}
            {data.aging_tickets.length === 0 && <p className="text-xs text-gray-400">No open tickets</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-xs font-black text-gray-500 uppercase mb-4">New Issues (Last 30 Days)</h3>
          <div className="h-40 flex items-end gap-1">
            {data.new_over_time.map((d: any) => {
              const maxCount = Math.max(...data.new_over_time.map((x: any) => x.count), 1);
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-[#e83330]/20 rounded-t"
                    style={{ height: `${(d.count / maxCount) * 100}%`, minHeight: d.count > 0 ? 4 : 0 }} />
                  <span className="text-[8px] text-gray-400 -rotate-45 origin-left whitespace-nowrap">
                    {d.date?.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
          {data.new_over_time.length === 0 && <p className="text-xs text-gray-400 text-center py-8">No data for last 30 days</p>}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-xs font-black text-gray-500 uppercase mb-4">Top Assignees</h3>
          <div className="space-y-2">
            {data.by_assignee.map(a => (
              <div key={a.full_name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-gray-400" />
                  <span className="font-semibold text-gray-700">{a.full_name || 'Unassigned'}</span>
                </div>
                <span className="font-bold text-gray-900">{a.count}</span>
              </div>
            ))}
            {data.by_assignee.length === 0 && <p className="text-xs text-gray-400">No data</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
