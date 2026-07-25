import { useState, useEffect } from 'react';
import {
  Plus, Save, Trash2, GripVertical, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Edit2, X
} from 'lucide-react';
import { issueService } from '../../services/issueService';

type Tab = 'areas' | 'features' | 'issue-types' | 'statuses' | 'priorities' | 'fields';

const TABS: { id: Tab; label: string }[] = [
  { id: 'areas', label: 'Product Areas' },
  { id: 'features', label: 'Features' },
  { id: 'issue-types', label: 'Issue Types' },
  { id: 'statuses', label: 'Statuses' },
  { id: 'priorities', label: 'Priorities' },
  { id: 'fields', label: 'Custom Fields' },
];

export default function FormConfigPage() {
  const [tab, setTab] = useState<Tab>('areas');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [newItem, setNewItem] = useState(false);

  useEffect(() => {
    loadData();
  }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await issueService.getConfigItems(tab);
      setData(res.data || []);
    } catch {}
    setLoading(false);
  };

  const resourceMap: Record<Tab, { fields: { key: string; label: string; type?: string }[] }> = {
    areas: { fields: [{ key: 'name', label: 'Name' }, { key: 'description', label: 'Description' }, { key: 'display_order', label: 'Order', type: 'number' }, { key: 'active', label: 'Active', type: 'number' }] },
    features: { fields: [{ key: 'name', label: 'Name' }, { key: 'description', label: 'Description' }, { key: 'display_order', label: 'Order', type: 'number' }, { key: 'product_area_id', label: 'Area ID' }, { key: 'active', label: 'Active', type: 'number' }] },
    'issue-types': { fields: [{ key: 'name', label: 'Name' }, { key: 'description', label: 'Description' }, { key: 'display_order', label: 'Order', type: 'number' }, { key: 'feature_id', label: 'Feature ID' }, { key: 'active', label: 'Active', type: 'number' }] },
    statuses: { fields: [{ key: 'name', label: 'Name' }, { key: 'code', label: 'Code' }, { key: 'colour', label: 'Colour' }, { key: 'display_order', label: 'Order', type: 'number' }, { key: 'active', label: 'Active', type: 'number' }] },
    priorities: { fields: [{ key: 'name', label: 'Name' }, { key: 'code', label: 'Code' }, { key: 'weight', label: 'Weight', type: 'number' }, { key: 'colour', label: 'Colour' }, { key: 'active', label: 'Active', type: 'number' }] },
    fields: { fields: [{ key: 'label', label: 'Label' }, { key: 'field_key', label: 'Key' }, { key: 'field_type', label: 'Type' }, { key: 'required', label: 'Required', type: 'number' }, { key: 'display_order', label: 'Order', type: 'number' }, { key: 'active', label: 'Active', type: 'number' }] },
  };

  const startEdit = (item: any) => {
    setEditing(item.id);
    setEditForm(item);
  };

  const saveEdit = async () => {
    if (!editing) return;
    await issueService.updateConfigItem(tab, editing, editForm);
    setEditing(null);
    loadData();
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    await issueService.deleteConfigItem(tab, id);
    loadData();
  };

  const createItem = async () => {
    const fields = resourceMap[tab].fields;
    const item: Record<string, any> = {};
    fields.forEach(f => item[f.key] = f.type === 'number' ? 0 : '');
    item.active = 1;
    await issueService.createConfigItem(tab, item);
    setNewItem(false);
    loadData();
  };

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Form Configuration</h1>
          <p className="text-sm text-gray-500 mt-1">Manage issue categories, statuses, and custom fields.</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              tab === t.id ? 'bg-[#e83330] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>{t.label}</button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs font-black text-gray-500 uppercase">{TABS.find(t => t.id === tab)?.label}</span>
          <button onClick={() => setNewItem(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#e83330] text-white rounded-lg text-xs font-bold hover:bg-[#c82e2c] transition-colors cursor-pointer">
            <Plus size={14} /> Add
          </button>
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            {[1,2,3,4].map(i => <div key={i} className="h-10 bg-gray-50 rounded-lg animate-pulse" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {resourceMap[tab].fields.map(f => (
                    <th key={f.key} className="text-left px-3 py-3 text-[10px] font-black text-gray-500 uppercase">{f.label}</th>
                  ))}
                  <th className="text-right px-3 py-3 text-[10px] font-black text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {newItem && (
                  <tr className="border-b border-blue-100 bg-blue-50/30">
                    {resourceMap[tab].fields.map(f => (
                      <td key={f.key} className="px-3 py-2">
                        <input type={f.type === 'number' ? 'number' : 'text'}
                          value={(editForm as any)[f.key] || ''}
                          onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                          placeholder={f.label}
                          className="w-full border border-blue-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300" />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={createItem}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"><CheckCircle2 size={14} /></button>
                        <button onClick={() => setNewItem(false)}
                          className="p-1.5 text-gray-400 hover:bg-gray-100 rounded cursor-pointer"><X size={14} /></button>
                      </div>
                    </td>
                  </tr>
                )}
                {data.map((item: any) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    {resourceMap[tab].fields.map(f => (
                      <td key={f.key} className="px-3 py-2.5">
                        {editing === item.id ? (
                          <input type={f.type === 'number' ? 'number' : 'text'}
                            value={editForm[f.key] ?? ''}
                            onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                            className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#e83330]/30" />
                        ) : (
                          <span className={`text-xs font-semibold ${f.key === 'colour' ? 'inline-flex items-center gap-1.5' : ''}`}>
                            {f.key === 'colour' && item.colour && (
                              <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: item.colour }} />
                            )}
                            {f.key === 'active' ? (
                              item[f.key] ? <CheckCircle2 size={14} className="text-emerald-500" /> : <XCircle size={14} className="text-gray-300" />
                            ) : f.type === 'number' ? (
                              item[f.key]
                            ) : (
                              String(item[f.key] ?? '')
                            )}
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {editing === item.id ? (
                          <>
                            <button onClick={saveEdit}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"><CheckCircle2 size={14} /></button>
                            <button onClick={() => setEditing(null)}
                              className="p-1.5 text-gray-400 hover:bg-gray-100 rounded cursor-pointer"><X size={14} /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(item)}
                              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded cursor-pointer"><Edit2 size={14} /></button>
                            <button onClick={() => deleteItem(item.id)}
                              className="p-1.5 text-red-400 hover:bg-red-50 rounded cursor-pointer"><Trash2 size={14} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
