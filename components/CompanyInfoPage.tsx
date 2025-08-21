
import { useData } from '../context/DataContext';
import React, { useState, useRef, useMemo } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from './icons';
import CompanyInfoGrid from './CompanyInfoGrid';

const CompanyInfoPage: React.FC = () => {

    const { companies, reloadCompanies, handleCreateCompanySimple, handleUpdateCompany, handleDeleteCompany } = useData() as any;
    // CSV upload removed (one-time import is no longer part of the app)
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const [editing, setEditing] = useState<{ id: string; field: EditableField } | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [selected, setSelected] = useState<{ [id: string]: boolean }>({});

    // Add form state
    const [showAdd, setShowAdd] = useState(false);
    const [addForm, setAddForm] = useState<{ name: string; type?: string; location?: string; address?: string; website?: string }>({ name: '' });


    type EditableField =
        | 'Company'
        | 'Vessels'
        | 'Company Nationality/Region'
        | 'Company Primary Activity - Level 1'
        | 'Company City'
        | 'Company Size'
        | 'Company Main Vessel Type'
        | 'Company Website'
        | 'Company Email Address'
        | 'Group Company'
        | 'Company Tel Number';

    // Resizable columns state
    // Excel-like: columns start as 'auto', user can resize to any width
    const [colWidths, setColWidths] = useState<{ [key: string]: number | undefined }>({
        'Company': undefined,
        'Vessels': undefined,
        'Company Nationality/Region': undefined,
        'Company Primary Activity - Level 1': undefined,
        'Company City': undefined,
        'Company Size': undefined,
        'Company Main Vessel Type': undefined,
        'Company Website': undefined,
        'Company Email Address': undefined,
        'Group Company': undefined,
        'Company Tel Number': undefined,
    });
    const resizingCol = useRef<string | null>(null);
    const startX = useRef<number>(0);
    const startWidth = useRef<number>(0);
    const headerRefs = useRef<Record<string, HTMLTableCellElement | null>>({});
    const tableContainerRef = useRef<HTMLDivElement | null>(null);

    // Canvas for measuring text width
    const measureCtx = useMemo(() => {
        const canvas = document.createElement('canvas');
        return canvas.getContext('2d');
    }, []);

    const measureText = (text: string) => {
        if (!measureCtx) return text?.length ? Math.min(Math.max(text.length * 7, 40), 800) : 40;
        // match table font size/family
        measureCtx.font = '13px Inter, Menlo, Monaco, Consolas, monospace';
        const metrics = measureCtx.measureText(text || '');
        const width = metrics.width;
        return Math.ceil(width);
    };

    const autoFitColumn = (col: string) => {
        // Measure header label
        const headerLabels: Record<string, string> = {
            'Company': 'Company',
            'Vessels': 'Vessels',
            'Company Nationality/Region': 'Company Nationality/Region',
            'Company Primary Activity - Level 1': 'Company Primary Activity - Level 1',
            'Company City': 'Company City',
            'Company Size': 'Company Size',
            'Company Main Vessel Type': 'Company Main Vessel Type',
            'Company Website': 'Company Website',
            'Company Email Address': 'Company Email Address',
            'Group Company': 'Group Company',
            'Company Tel Number': 'Company Tel Number'
        };
        let max = measureText(headerLabels[col] || col);
        // Measure up to first 200 rows for performance
        const rows = Array.isArray(companies) ? companies.slice(0, 200) : [];
        for (const r of rows) {
            const val = r?.[col];
            if (val == null) continue;
            const w = measureText(String(val));
            if (w > max) max = w;
        }
        // Add padding for cell gutters
        const padded = Math.min(Math.max(max + 24, 48), 900);
        setColWidths(w => ({ ...w, [col]: padded }));
    };

    const handleResizeStart = (col: string, e: React.MouseEvent) => {
        resizingCol.current = col;
        startX.current = e.clientX;
        // Fallback to actual DOM width if not explicitly set
        const currentSetWidth = colWidths[col];
        if (typeof currentSetWidth === 'number' && !Number.isNaN(currentSetWidth)) {
            startWidth.current = currentSetWidth;
        } else {
            const th = headerRefs.current[col];
            startWidth.current = Math.max(48, (th?.offsetWidth || 80));
        }
        document.addEventListener('mousemove', handleResizeMove);
        document.addEventListener('mouseup', handleResizeEnd);
    };

    const handleResizeMove = (e: MouseEvent) => {
        if (!resizingCol.current) return;
            const diff = e.clientX - startX.current;
            setColWidths(w => ({ ...w, [resizingCol.current!]: Math.max(24, startWidth.current + diff) }));
    };

    const handleResizeEnd = () => {
        resizingCol.current = null;
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
    };
    const startEdit = (id: string, field: EditableField, value: string) => {
        setEditing({ id, field });
        setEditValue(value);
    };

    const saveEdit = async (company: any) => {
        if (!editing) return;
        if (editValue.trim() === '' || editValue === company[editing.field]) {
            setEditing(null);
            return;
        }
        // Call update handler (should update backend and context)
        await handleUpdateCompany({ id: company.id, [editing.field]: editValue });
        setEditing(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent, company: any) => {
        if (e.key === 'Enter') {
            saveEdit(company);
        } else if (e.key === 'Escape') {
            setEditing(null);
        }
    };

    // Upload removed

    return (
        <div className="flex flex-col h-full w-full m-0 p-0 bg-white dark:bg-gray-900">
            {/* Top banner removed as requested */}
            <div className="flex-1 min-h-0">
                <CompanyInfoGrid />
            </div>
            <div className="flex items-center justify-between px-3 py-2 border-t border-primary-200 dark:border-gray-700 bg-primary-50 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-300">
                <span>{companies.length} companies</span>
                <div className="flex items-center gap-3">
                    <button title="Add company" className="p-1 hover:bg-primary-100 dark:hover:bg-gray-700 rounded" onClick={()=> setShowAdd(s=>!s)}>
                        <PlusIcon className="h-5 w-5" />
                    </button>
                    <button title="Edit selected (Company Website)" className="p-1 hover:bg-primary-100 dark:hover:bg-gray-700 rounded" onClick={async()=>{
                        const ids = Object.keys(selected).filter(k=>selected[k]);
                        if (ids.length !== 1) return alert('Select exactly one row to edit.');
                        const id = ids[0];
                        const row = companies.find((c:any)=> String(c.id)===String(id));
                        const current = row?.['Company Website'] || '';
                        const next = window.prompt('Edit Company Website', current);
                        if (next === null) return;
                        await handleUpdateCompany({ id, 'Company Website': next });
                    }}>
                        <PencilIcon className="h-5 w-5" />
                    </button>
                    <button title="Delete selected" className="p-1 hover:bg-primary-100 dark:hover:bg-gray-700 rounded" onClick={async()=>{
                        const ids = Object.keys(selected).filter(k=>selected[k]);
                        if (!ids.length) return alert('Select rows to delete.');
                        if (!confirm(`Delete ${ids.length} compan${ids.length>1?'ies':'y'}?`)) return;
                        for (const id of ids) {
                            await handleDeleteCompany(id);
                        }
                        setSelected({});
                    }}>
                        <TrashIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CompanyInfoPage;
