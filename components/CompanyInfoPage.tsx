
import { useData } from '../context/DataContext';
import React, { useState, useRef, useMemo } from 'react';
import { PlusIcon, TrashIcon } from './icons';
import CompanyInfoGrid from './CompanyInfoGrid';

const CompanyInfoPage: React.FC = () => {

    const { companies, reloadCompanies, handleCreateCompanySimple, handleUpdateCompany, handleDeleteCompany } = useData() as any;
    // CSV upload removed (one-time import is no longer part of the app)
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    // Grid selection (controlled)
    const [selectedRows, setSelectedRows] = useState<ReadonlySet<number | string>>(new Set());
    // Trigger to insert a new draft row in the grid
    const [addTrigger, setAddTrigger] = useState(0);
    // Counts and footer controls
    const [visibleCount, setVisibleCount] = useState<number>(0);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [clearFiltersTrigger, setClearFiltersTrigger] = useState<number>(0);

    // Add quick action (no modal yet)


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
    // Legacy inline edit handlers for the old table are no longer used with DataGrid

    // Upload removed

    return (
    <div className="flex flex-col h-full w-full m-0 p-0 bg-white dark:bg-gray-900" style={{ paddingLeft: 0 }}>
            {/* Top banner removed as requested */}
            <div className="flex-1 min-h-0 overflow-auto">
                <CompanyInfoGrid
                    selectedRows={selectedRows}
                    onSelectedRowsChange={setSelectedRows}
                    addTrigger={addTrigger}
                    onCountsChange={(v, t) => { setVisibleCount(v); setTotalCount(t); }}
                    clearFiltersTrigger={clearFiltersTrigger}
                />
            </div>
            <div className="flex items-center justify-between px-3 py-2 border-t border-primary-200 dark:border-gray-700 bg-primary-50 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-300">
                <span>{visibleCount === totalCount ? `${totalCount} companies` : `${visibleCount} of ${totalCount} companies`}</span>
                <div className="flex items-center gap-3">
                    <button title="Clear filters" className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600" onClick={() => setClearFiltersTrigger(t => t + 1)}>
                        Clear filters
                    </button>
                    <button title="Reload companies" className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600" onClick={reloadCompanies}>
                        Reload
                    </button>
                    <button title="Add company" className="p-1 hover:bg-primary-100 dark:hover:bg-gray-700 rounded" onClick={()=>{
                        setAddTrigger(t => t + 1);
                    }}>
                        <PlusIcon className="h-5 w-5" />
                    </button>
                    <button title="Delete selected" className="p-1 hover:bg-primary-100 dark:hover:bg-gray-700 rounded" onClick={async()=>{
                        const ids = Array.from(selectedRows);
                        if (!ids.length) return alert('Select rows to delete.');
                        if (!confirm(`Delete ${ids.length} compan${ids.length>1?'ies':'y'}?`)) return;
                        for (const id of ids) {
                            await handleDeleteCompany(id);
                        }
                        setSelectedRows(new Set());
                    }}>
                        <TrashIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CompanyInfoPage;
