import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { useData } from '../context/DataContext';

interface Props { onClose: () => void }

export const ManageTemplatesModal: React.FC<Props> = ({ onClose }) => {
  const { listProductDescriptions, updateProductDescription } = useData();
  const [rows, setRows] = useState<Array<{ key: string; scope_template: string; updated_at?: string }>>([]);
  const [selected, setSelected] = useState('');
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const sel = useMemo(() => rows.find(r => r.key === selected), [rows, selected]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await listProductDescriptions();
        if (!mounted) return;
        setRows(list || []);
        if (list && list.length) {
          setSelected(list[0].key);
          setText(list[0].scope_template || '');
        }
      } catch (e) {
        alert('Failed to load templates. Ensure you are admin (ADMIN_USERS)');
      }
    })();
    return () => { mounted = false; };
  }, [listProductDescriptions]);

  useEffect(() => { if (sel) setText(sel.scope_template || ''); }, [sel]);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await updateProductDescription(selected, text);
      setRows(prev => prev.map(r => r.key === updated.key ? updated : r));
    } catch (e) {
      alert(`Save failed: ${(e as any)?.message || 'Unknown error'}`);
    } finally { setSaving(false); }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Manage Quote Templates" size="4xl">
      <div className="p-4 text-sm">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Template Key</label>
            <select value={selected} onChange={e => setSelected(e.target.value)} className="w-full p-1 bg-transparent border rounded-md dark:border-gray-600">
              {rows.map(r => (<option key={r.key} value={r.key}>{r.key}</option>))}
            </select>
            {sel?.updated_at && (
              <div className="text-[11px] mt-1 text-gray-500 dark:text-gray-400">Updated: {new Date(sel.updated_at).toLocaleString()}</div>
            )}
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Template (placeholders like {'{capacity}, {head}, {motorRating}, {motorVariant}'})</label>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={14} className="w-full p-2 bg-white dark:bg-gray-800 border rounded-md dark:border-gray-700" />
            <div className="flex justify-end mt-2">
              <button disabled={saving} onClick={handleSave} className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

