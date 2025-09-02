import React from 'react';
import { API_URL } from '../hooks/useCrmData';
import type { MarketIntel } from '../types';

const MarketIntelPage: React.FC = () => {
  const [items, setItems] = React.useState<MarketIntel[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [form, setForm] = React.useState<Partial<MarketIntel>>({ source: '', url: '', summary: '', region: '', fuelType: '', vesselType: '', vesselsCount: 1, notes: '' });
  const [saving, setSaving] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const authHeaders = () => {
    const t = localStorage.getItem('token');
    return t ? { Authorization: `Bearer ${t}` } : {};
  };
  const canPost = Boolean(localStorage.getItem('token'));
  React.useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`${API_URL}/api/intel`, { headers: { ...authHeaders() } });
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Fetch intel failed', e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);
  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/intel`, { headers: { ...authHeaders() } });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  };

  const resetForm = () => { setForm({ source: '', url: '', summary: '', region: '', fuelType: '', vesselType: '', vesselsCount: 1, notes: '' }); setEditingId(null); };
  const vesselTypeHints = ['OSV', 'PSV', 'AHTS', 'Fishing', 'RoRo', 'Container', 'Bulker', 'Product Tanker', 'Shuttle Tanker', 'FPSO', 'Cruise', 'Ferry'];

  const save = async () => {
    if (!canPost) { alert('Please log in to add intel.'); return; }
    try {
      setSaving(true);
      const method = editingId ? 'PATCH' : 'POST';
      const url = editingId ? `${API_URL}/api/intel/${editingId}` : `${API_URL}/api/intel`;
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error(await res.text());
      await load();
      resetForm();
    } catch (e) {
      console.error('Save intel failed', e);
      alert('Save failed');
    } finally { setSaving(false); }
  };

  const promoteToLead = async (intel: MarketIntel) => {
    if (!canPost) { alert('Login required'); return; }
    try {
      const body = { vesselType: intel.vesselType, fuelType: intel.fuelType, region: intel.region, vesselsCount: intel.vesselsCount, sourceIntelId: intel.id };
      const res = await fetch(`${API_URL}/api/leads`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(await res.text());
      // also mark intel as promoted
      await fetch(`${API_URL}/api/intel/${intel.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ status: 'Promoted' }) });
      await load();
      alert('Promoted to Lead');
    } catch (e) {
      console.error('Promote failed', e);
      alert('Promote failed');
    }
  };

  const discardIntel = async (intel: MarketIntel) => {
    if (!canPost) { alert('Login required'); return; }
    const reason = prompt('Discard reason?');
    try {
      await fetch(`${API_URL}/api/intel/${intel.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ status: 'Discarded', discardedReason: reason || '' }) });
      await load();
    } catch (e) { console.error('Discard failed', e); alert('Discard failed'); }
  };
  if (loading) return <div className="p-4 text-sm text-gray-500">Loading…</div>;
  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-lg font-semibold">Market Intelligence</div>
      </div>
      {/* Create/Edit form */}
      <div className="bg-white dark:bg-gray-800 rounded-md border dark:border-gray-700 p-3 mb-3">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <input className="px-2 py-1 rounded border dark:border-gray-700 bg-white dark:bg-gray-900" placeholder="Source" value={form.source||''} onChange={e=>setForm(f=>({...f, source:e.target.value}))} />
          <input className="px-2 py-1 rounded border dark:border-gray-700 bg-white dark:bg-gray-900" placeholder="URL" value={form.url||''} onChange={e=>setForm(f=>({...f, url:e.target.value}))} />
          <input className="px-2 py-1 rounded border dark:border-gray-700 bg-white dark:bg-gray-900" placeholder="Region" value={form.region||''} onChange={e=>setForm(f=>({...f, region:e.target.value}))} />
          <input className="px-2 py-1 rounded border dark:border-gray-700 bg-white dark:bg-gray-900" placeholder="Fuel Type" value={form.fuelType as string||''} onChange={e=>setForm(f=>({...f, fuelType:e.target.value}))} />
          <input list="vessel-type-hints" className="px-2 py-1 rounded border dark:border-gray-700 bg-white dark:bg-gray-900" placeholder="Vessel Type" value={form.vesselType||''} onChange={e=>setForm(f=>({...f, vesselType:e.target.value}))} />
          <datalist id="vessel-type-hints">
            {vesselTypeHints.map(v => (<option key={v} value={v} />))}
          </datalist>
          <input type="number" className="px-2 py-1 rounded border dark:border-gray-700 bg-white dark:bg-gray-900" placeholder="# Vessels" value={form.vesselsCount||1} onChange={e=>setForm(f=>({...f, vesselsCount: Number(e.target.value)||1}))} />
          <input className="col-span-2 md:col-span-3 px-2 py-1 rounded border dark:border-gray-700 bg-white dark:bg-gray-900" placeholder="Summary" value={form.summary||''} onChange={e=>setForm(f=>({...f, summary:e.target.value}))} />
          <input className="col-span-2 md:col-span-3 px-2 py-1 rounded border dark:border-gray-700 bg-white dark:bg-gray-900" placeholder="Notes" value={form.notes||''} onChange={e=>setForm(f=>({...f, notes:e.target.value}))} />
        </div>
        <div className="mt-2 flex gap-2">
          <button disabled={!canPost || saving} onClick={save} className={`px-3 py-1.5 text-sm rounded ${canPost? 'bg-blue-600 text-white hover:bg-blue-500':'bg-gray-300 text-gray-600 cursor-not-allowed'}`}>{editingId? 'Update':'Add'}</button>
          {editingId && (<button onClick={resetForm} className="px-3 py-1.5 text-sm rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">Cancel</button>)}
        </div>
        {!canPost && <div className="mt-2 text-xs text-gray-500">Login to add intel.</div>}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-md border dark:border-gray-700 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-200">
            <tr>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Source</th>
              <th className="px-3 py-2 text-left">Fuel</th>
              <th className="px-3 py-2 text-left">Vessel</th>
              <th className="px-3 py-2 text-left">Region</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Link</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t dark:border-gray-700 hover:bg-gray-50/60 dark:hover:bg-gray-700/50">
                <td className="px-3 py-2 whitespace-nowrap">{it.createdAt?.slice(0,10) || ''}</td>
                <td className="px-3 py-2">{it.source || ''}</td>
                <td className="px-3 py-2">{it.fuelType || ''}</td>
                <td className="px-3 py-2">{it.vesselType || ''} {it.vesselsCount ? `(${it.vesselsCount})` : ''}</td>
                <td className="px-3 py-2">{it.region || ''}</td>
                <td className="px-3 py-2">{it.status || ''}</td>
                <td className="px-3 py-2">{it.url ? <a className="text-blue-600 hover:underline" href={it.url} target="_blank" rel="noreferrer">open</a> : ''}</td>
                <td className="px-3 py-2 space-x-2">
                  <button disabled={!canPost} className={`px-2 py-1 text-xs rounded ${canPost? 'bg-emerald-600 text-white hover:bg-emerald-500':'bg-gray-300 text-gray-600'}`} onClick={()=>promoteToLead(it)}>Promote</button>
                  <button disabled={!canPost} className={`px-2 py-1 text-xs rounded ${canPost? 'bg-yellow-600 text-white hover:bg-yellow-500':'bg-gray-300 text-gray-600'}`} onClick={()=>{ setEditingId(it.id); setForm({ source: it.source, url: it.url, summary: it.summary, region: it.region, fuelType: it.fuelType, vesselType: it.vesselType, vesselsCount: it.vesselsCount||1, notes: it.notes }); }}>Edit</button>
                  <button disabled={!canPost} className={`px-2 py-1 text-xs rounded ${canPost? 'bg-red-600 text-white hover:bg-red-500':'bg-gray-300 text-gray-600'}`} onClick={()=>discardIntel(it)}>Discard</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={8}>No intel yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MarketIntelPage;
