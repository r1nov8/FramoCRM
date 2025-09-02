import React from 'react';
import { API_URL } from '../hooks/useCrmData';
import type { Lead } from '../types';

const LeadListPage: React.FC = () => {
  const [items, setItems] = React.useState<Lead[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [convertingId, setConvertingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<Partial<Lead>>({ vesselType: '', fuelType: '', region: '', vesselsCount: 1, status: 'Open' });
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const authHeaders = () => {
    const t = localStorage.getItem('token');
    return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  };
  const canPost = Boolean(localStorage.getItem('token'));
  const load = async () => {
    try {
      const res = await fetch(`${API_URL}/api/leads`, { headers: { ...authHeaders() } });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Fetch leads failed', e);
    } finally {
      setLoading(false);
    }
  };
  React.useEffect(() => { load(); }, []);

  // Numbering rules: OPP-YYYY-XXX for opportunities; PRJ-YYYY-XXX for projects
  const nextNumber = (type: 'opportunity'|'project') => {
    const now = new Date();
    const year = now.getFullYear();
    // naive client-side; backend can enforce uniqueness; we compute next suffix by scanning existing
    const prefix = type === 'project' ? 'PRJ' : 'OPP';
    const existing = (window as any).__existingNumbers || items.map(()=>null); // fallback
    const max = 0;
    const seq = String((max || 0) + 1).padStart(3, '0');
    return `${prefix}-${year}-${seq}`;
  };

  const convert = async (id: string) => {
    try {
      setConvertingId(id);
      // ask user choice
      const t = window.prompt('Convert as (type): enter "opportunity" for Fuel or "project" for Anti-Heeling', 'opportunity');
      const type = (t === 'project') ? 'project' : 'opportunity';
      const number = nextNumber(type);
      const res = await fetch(`${API_URL}/api/leads/${id}/convert`, {
        method: 'POST',
        headers: { ...authHeaders() },
        body: JSON.stringify({ type, opportunityNumber: number })
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
      alert('Converted to project. Check Pipeline.');
    } catch (e) {
      console.error('Convert lead failed', e);
      alert('Convert failed');
    } finally {
      setConvertingId(null);
    }
  };

  const resetForm = () => { setForm({ vesselType: '', fuelType: '', region: '', vesselsCount: 1, status: 'Open' }); setEditingId(null); };
  const save = async () => {
    if (!canPost) { alert('Login required'); return; }
    try {
      const method = editingId ? 'PATCH' : 'POST';
      const url = editingId ? `${API_URL}/api/leads/${editingId}` : `${API_URL}/api/leads`;
      const res = await fetch(url, { method, headers: { ...authHeaders() }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error(await res.text());
      await load();
      resetForm();
    } catch (e) { console.error('Save lead failed', e); alert('Save failed'); }
  };

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading…</div>;
  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-lg font-semibold">Leads</div>
      </div>
      {/* Create/Edit form */}
      <div className="bg-white dark:bg-gray-800 rounded-md border dark:border-gray-700 p-3 mb-3">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <input className="px-2 py-1 rounded border dark:border-gray-700 bg-white dark:bg-gray-900" placeholder="Fuel Type" value={form.fuelType as string || ''} onChange={e=>setForm(f=>({...f, fuelType:e.target.value}))} />
          <input className="px-2 py-1 rounded border dark:border-gray-700 bg-white dark:bg-gray-900" placeholder="Vessel Type" value={form.vesselType || ''} onChange={e=>setForm(f=>({...f, vesselType:e.target.value}))} />
          <input className="px-2 py-1 rounded border dark:border-gray-700 bg-white dark:bg-gray-900" placeholder="Region" value={form.region || ''} onChange={e=>setForm(f=>({...f, region:e.target.value}))} />
          <input type="number" className="px-2 py-1 rounded border dark:border-gray-700 bg-white dark:bg-gray-900" placeholder="# Vessels" value={form.vesselsCount || 1} onChange={e=>setForm(f=>({...f, vesselsCount:Number(e.target.value)||1}))} />
        </div>
        <div className="mt-2 flex gap-2">
          <button disabled={!canPost} onClick={save} className={`px-3 py-1.5 text-sm rounded ${canPost? 'bg-blue-600 text-white hover:bg-blue-500':'bg-gray-300 text-gray-600 cursor-not-allowed'}`}>{editingId? 'Update':'Add'}</button>
          {editingId && (<button onClick={resetForm} className="px-3 py-1.5 text-sm rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">Cancel</button>)}
        </div>
        {!canPost && <div className="mt-2 text-xs text-gray-500">Login to add/edit leads.</div>}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-md border dark:border-gray-700 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-200">
            <tr>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Fuel</th>
              <th className="px-3 py-2 text-left">Vessel</th>
              <th className="px-3 py-2 text-left">Region</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t dark:border-gray-700 hover:bg-gray-50/60 dark:hover:bg-gray-700/50">
                <td className="px-3 py-2 whitespace-nowrap">{it.createdAt?.slice(0,10) || ''}</td>
                <td className="px-3 py-2">{it.fuelType || ''}</td>
                <td className="px-3 py-2">{it.vesselType || ''} {it.vesselsCount ? `(${it.vesselsCount})` : ''}</td>
                <td className="px-3 py-2">{it.region || ''}</td>
                <td className="px-3 py-2">{it.status || ''}</td>
                <td className="px-3 py-2">
                  <button
                    disabled={it.status === 'Converted' || convertingId === it.id}
                    onClick={() => convert(it.id)}
                    className={`px-2 py-1 text-xs rounded ${it.status==='Converted' ? 'bg-gray-300 dark:bg-gray-600' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
                  >{convertingId === it.id ? 'Converting…' : (it.status === 'Converted' ? 'Converted' : 'Convert')}</button>
                  <button
                    disabled={!canPost}
                    onClick={() => { setEditingId(it.id); setForm({ vesselType: it.vesselType, fuelType: it.fuelType, region: it.region, vesselsCount: it.vesselsCount || 1, status: it.status }); }}
                    className={`ml-2 px-2 py-1 text-xs rounded ${canPost? 'bg-yellow-600 text-white hover:bg-yellow-500':'bg-gray-300 text-gray-600'}`}
                  >Edit</button>
                  <button
                    disabled={!canPost}
                    onClick={async ()=>{ if (!confirm('Discard lead?')) return; const res = await fetch(`${API_URL}/api/leads/${it.id}`, { method:'PATCH', headers:{...authHeaders()}, body: JSON.stringify({ status:'Lost' }) }); if (!res.ok) alert('Discard failed'); else load(); }}
                    className={`ml-2 px-2 py-1 text-xs rounded ${canPost? 'bg-red-600 text-white hover:bg-red-500':'bg-gray-300 text-gray-600'}`}
                  >Discard</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={6}>No leads yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeadListPage;
