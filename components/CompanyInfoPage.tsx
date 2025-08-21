
import { useData } from '../context/DataContext';
import React, { useState, useRef } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from './icons';

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

    const handleResizeStart = (col: string, e: React.MouseEvent) => {
        resizingCol.current = col;
        startX.current = e.clientX;
        startWidth.current = colWidths[col];
        document.addEventListener('mousemove', handleResizeMove);
        document.addEventListener('mouseup', handleResizeEnd);
    };

    const handleResizeMove = (e: MouseEvent) => {
        if (!resizingCol.current) return;
        const diff = e.clientX - startX.current;
        setColWidths(w => ({ ...w, [resizingCol.current!]: Math.max(10, startWidth.current + diff) }));
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
            {/* CSV upload UI removed; one-time import handled by backend/scripts/import_companies_csv.js */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-primary-200 dark:border-gray-700 bg-primary-50 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-300">
                <span>{Array.isArray(companies) ? `${companies.length} rows` : 'No data'}</span>
                <button onClick={reloadCompanies} className="px-2 py-1 border border-primary-200 dark:border-gray-600 rounded hover:bg-primary-100 dark:hover:bg-gray-700">Reload</button>
            </div>
            <div className="flex-1 overflow-x-auto m-0 p-0" style={{maxHeight: 'calc(100vh - 6rem)'}}>
                <table className="min-w-full w-full border-separate border-spacing-0 select-none table-fixed text-[13px]" style={{ fontFamily: 'Inter, Menlo, Monaco, Consolas, monospace', borderCollapse: 'separate' }}>
                    <colgroup>
                        {[
                            <col key="col-company" style={colWidths['Company'] ? { width: colWidths['Company'] } : {}} />,
                            <col key="col-vessels" style={colWidths['Vessels'] ? { width: colWidths['Vessels'] } : {}} />,
                            <col key="col-nationality" style={colWidths['Company Nationality/Region'] ? { width: colWidths['Company Nationality/Region'] } : {}} />,
                            <col key="col-activity" style={colWidths['Company Primary Activity - Level 1'] ? { width: colWidths['Company Primary Activity - Level 1'] } : {}} />,
                            <col key="col-city" style={colWidths['Company City'] ? { width: colWidths['Company City'] } : {}} />,
                            <col key="col-size" style={colWidths['Company Size'] ? { width: colWidths['Company Size'] } : {}} />,
                            <col key="col-vessel-type" style={colWidths['Company Main Vessel Type'] ? { width: colWidths['Company Main Vessel Type'] } : {}} />,
                            <col key="col-website" style={colWidths['Company Website'] ? { width: colWidths['Company Website'] } : {}} />,
                            <col key="col-email" style={colWidths['Company Email Address'] ? { width: colWidths['Company Email Address'] } : {}} />,
                            <col key="col-group" style={colWidths['Group Company'] ? { width: colWidths['Group Company'] } : {}} />,
                            <col key="col-tel" style={colWidths['Company Tel Number'] ? { width: colWidths['Company Tel Number'] } : {}} />
                        ]}
                    </colgroup>
                    <thead className="bg-primary-50 dark:bg-gray-800 sticky top-0 z-10">
                        <tr>
                            {[
                                { key: 'Company', label: 'Company' },
                                { key: 'Vessels', label: 'Vessels' },
                                { key: 'Company Nationality/Region', label: 'Company Nationality/Region' },
                                { key: 'Company Primary Activity - Level 1', label: 'Company Primary Activity - Level 1' },
                                { key: 'Company City', label: 'Company City' },
                                { key: 'Company Size', label: 'Company Size' },
                                { key: 'Company Main Vessel Type', label: 'Company Main Vessel Type' },
                                { key: 'Company Website', label: 'Company Website' },
                                { key: 'Company Email Address', label: 'Company Email Address' },
                                { key: 'Group Company', label: 'Group Company' },
                                { key: 'Company Tel Number', label: 'Company Tel Number' },
                            ].map(col => (
                                <th key={col.key} className="border-b border-r last:border-r-0 border-primary-200 dark:border-gray-700 bg-primary-50 dark:bg-gray-800 font-semibold text-left px-2 whitespace-nowrap group relative select-none" style={{ minWidth: 80 }}>
                                    {col.label}
                                    <span className="absolute right-0 top-0 h-full w-2 cursor-col-resize group-hover:bg-primary-100/30 dark:group-hover:bg-gray-700/30" onMouseDown={e => handleResizeStart(col.key, e)} style={{ zIndex: 30 }} />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900">
            {companies.map((company: any) => (
                            <tr key={company.id || company['Company']} className={"hover:bg-primary-50 dark:hover:bg-gray-800 transition-colors " + (selected[company.id] ? 'bg-primary-50/60 dark:bg-gray-800/60' : '')} onClick={() => setSelected(s => ({ ...s, [company.id]: !s[company.id] }))}>
                <td className="border-b border-r border-primary-200 dark:border-gray-700 px-2 py-1 whitespace-pre-wrap break-words align-top" title={company['Company']} onDoubleClick={()=>startEdit(String(company.id), 'Company', company['Company'] || '')}>
                                    {editing && editing.id===String(company.id) && editing.field==='Company' ? (
                                        <input autoFocus className="w-full bg-white dark:bg-gray-900 border border-primary-200 dark:border-gray-700 px-2 py-1 rounded text-sm" value={editValue} onChange={e=>setEditValue(e.target.value)} onBlur={()=>saveEdit(company)} onKeyDown={(e)=>handleKeyDown(e, company)} />
                                    ) : (
                                        company['Company']
                                    )}
                                </td>
                <td className="border-b border-r border-primary-200 dark:border-gray-700 px-2 py-1 whitespace-pre-wrap break-words align-top" title={company['Vessels']} onDoubleClick={()=>startEdit(String(company.id), 'Vessels', company['Vessels'] || '')}>
                                    {editing && editing.id===String(company.id) && editing.field==='Vessels' ? (
                                        <input autoFocus className="w-full bg-white dark:bg-gray-900 border border-primary-200 dark:border-gray-700 px-2 py-1 rounded text-sm" value={editValue} onChange={e=>setEditValue(e.target.value)} onBlur={()=>saveEdit(company)} onKeyDown={(e)=>handleKeyDown(e, company)} />
                                    ) : (
                                        company['Vessels']
                                    )}
                                </td>
                <td className="border-b border-r border-primary-200 dark:border-gray-700 px-2 py-1 whitespace-pre-wrap break-words align-top" title={company['Company Nationality/Region']} onDoubleClick={()=>startEdit(String(company.id), 'Company Nationality/Region', company['Company Nationality/Region'] || '')}>
                                    {editing && editing.id===String(company.id) && editing.field==='Company Nationality/Region' ? (
                                        <input autoFocus className="w-full bg-white dark:bg-gray-900 border border-primary-200 dark:border-gray-700 px-2 py-1 rounded text-sm" value={editValue} onChange={e=>setEditValue(e.target.value)} onBlur={()=>saveEdit(company)} onKeyDown={(e)=>handleKeyDown(e, company)} />
                                    ) : (
                                        company['Company Nationality/Region']
                                    )}
                                </td>
                <td className="border-b border-r border-primary-200 dark:border-gray-700 px-2 py-1 whitespace-pre-wrap break-words align-top" title={company['Company Primary Activity - Level 1']} onDoubleClick={()=>startEdit(String(company.id), 'Company Primary Activity - Level 1', company['Company Primary Activity - Level 1'] || '')}>
                                    {editing && editing.id===String(company.id) && editing.field==='Company Primary Activity - Level 1' ? (
                                        <input autoFocus className="w-full bg-white dark:bg-gray-900 border border-primary-200 dark:border-gray-700 px-2 py-1 rounded text-sm" value={editValue} onChange={e=>setEditValue(e.target.value)} onBlur={()=>saveEdit(company)} onKeyDown={(e)=>handleKeyDown(e, company)} />
                                    ) : (
                                        company['Company Primary Activity - Level 1']
                                    )}
                                </td>
                <td className="border-b border-r border-primary-200 dark:border-gray-700 px-2 py-1 whitespace-pre-wrap break-words align-top" title={company['Company City']} onDoubleClick={()=>startEdit(String(company.id), 'Company City', company['Company City'] || '')}>
                                    {editing && editing.id===String(company.id) && editing.field==='Company City' ? (
                                        <input autoFocus className="w-full bg-white dark:bg-gray-900 border border-primary-200 dark:border-gray-700 px-2 py-1 rounded text-sm" value={editValue} onChange={e=>setEditValue(e.target.value)} onBlur={()=>saveEdit(company)} onKeyDown={(e)=>handleKeyDown(e, company)} />
                                    ) : (
                                        company['Company City']
                                    )}
                                </td>
                <td className="border-b border-r border-primary-200 dark:border-gray-700 px-2 py-1 whitespace-pre-wrap break-words align-top" title={company['Company Size']} onDoubleClick={()=>startEdit(String(company.id), 'Company Size', company['Company Size'] || '')}>
                                    {editing && editing.id===String(company.id) && editing.field==='Company Size' ? (
                                        <input autoFocus className="w-full bg-white dark:bg-gray-900 border border-primary-200 dark:border-gray-700 px-2 py-1 rounded text-sm" value={editValue} onChange={e=>setEditValue(e.target.value)} onBlur={()=>saveEdit(company)} onKeyDown={(e)=>handleKeyDown(e, company)} />
                                    ) : (
                                        company['Company Size']
                                    )}
                                </td>
                <td className="border-b border-r border-primary-200 dark:border-gray-700 px-2 py-1 whitespace-pre-wrap break-words align-top" title={company['Company Main Vessel Type']} onDoubleClick={()=>startEdit(String(company.id), 'Company Main Vessel Type', company['Company Main Vessel Type'] || '')}>
                                    {editing && editing.id===String(company.id) && editing.field==='Company Main Vessel Type' ? (
                                        <input autoFocus className="w-full bg-white dark:bg-gray-900 border border-primary-200 dark:border-gray-700 px-2 py-1 rounded text-sm" value={editValue} onChange={e=>setEditValue(e.target.value)} onBlur={()=>saveEdit(company)} onKeyDown={(e)=>handleKeyDown(e, company)} />
                                    ) : (
                                        company['Company Main Vessel Type']
                                    )}
                                </td>
                <td className="border-b border-r border-primary-200 dark:border-gray-700 px-2 py-1 whitespace-pre-wrap break-words break-all align-top" title={company['Company Website']} onDoubleClick={()=>startEdit(String(company.id), 'Company Website', company['Company Website'] || '')}>
                                    {editing && editing.id===String(company.id) && editing.field==='Company Website' ? (
                                        <input autoFocus className="w-full bg-white dark:bg-gray-900 border border-primary-200 dark:border-gray-700 px-2 py-1 rounded text-sm" value={editValue} onChange={e=>setEditValue(e.target.value)} onBlur={()=>saveEdit(company)} onKeyDown={(e)=>handleKeyDown(e, company)} />
                                    ) : (
                                        company['Company Website'] ?? ''
                                    )}
                                </td>
                <td className="border-b border-r border-primary-200 dark:border-gray-700 px-2 py-1 whitespace-pre-wrap break-words align-top" title={company['Company Email Address']} onDoubleClick={()=>startEdit(String(company.id), 'Company Email Address', company['Company Email Address'] || '')}>
                                    {editing && editing.id===String(company.id) && editing.field==='Company Email Address' ? (
                                        <input autoFocus className="w-full bg-white dark:bg-gray-900 border border-primary-200 dark:border-gray-700 px-2 py-1 rounded text-sm" value={editValue} onChange={e=>setEditValue(e.target.value)} onBlur={()=>saveEdit(company)} onKeyDown={(e)=>handleKeyDown(e, company)} />
                                    ) : (
                                        company['Company Email Address']
                                    )}
                                </td>
                <td className="border-b border-r border-primary-200 dark:border-gray-700 px-2 py-1 whitespace-pre-wrap break-words align-top" title={company['Group Company']} onDoubleClick={()=>startEdit(String(company.id), 'Group Company', company['Group Company'] || '')}>
                                    {editing && editing.id===String(company.id) && editing.field==='Group Company' ? (
                                        <input autoFocus className="w-full bg-white dark:bg-gray-900 border border-primary-200 dark:border-gray-700 px-2 py-1 rounded text-sm" value={editValue} onChange={e=>setEditValue(e.target.value)} onBlur={()=>saveEdit(company)} onKeyDown={(e)=>handleKeyDown(e, company)} />
                                    ) : (
                                        company['Group Company']
                                    )}
                                </td>
                <td className="border-b border-primary-200 dark:border-gray-700 px-2 py-1 whitespace-pre-wrap break-words align-top" title={company['Company Tel Number']} onDoubleClick={()=>startEdit(String(company.id), 'Company Tel Number', company['Company Tel Number'] || '')}>
                                    {editing && editing.id===String(company.id) && editing.field==='Company Tel Number' ? (
                                        <input autoFocus className="w-full bg-white dark:bg-gray-900 border border-primary-200 dark:border-gray-700 px-2 py-1 rounded text-sm" value={editValue} onChange={e=>setEditValue(e.target.value)} onBlur={()=>saveEdit(company)} onKeyDown={(e)=>handleKeyDown(e, company)} />
                                    ) : (
                                        company['Company Tel Number']
                                    )}
                                </td>
                            </tr>
                        ))}
                        {showAdd && (
                            <tr className="bg-primary-50/40 dark:bg-gray-800/40">
                                <td className="border-b border-r border-primary-200 dark:border-gray-700 px-2 py-1">
                                    <input className="w-full bg-white dark:bg-gray-900 border border-primary-200 dark:border-gray-700 px-2 py-1 rounded text-sm" placeholder="Company (required)" value={addForm.name} onChange={(e)=>setAddForm(f=>({...f,name:e.target.value}))} />
                                </td>
                                <td className="border-b border-r border-primary-200 dark:border-gray-700 px-2 py-1"></td>
                                <td className="border-b border-r border-primary-200 dark:border-gray-700 px-2 py-1">
                                    <input className="w-full bg-white dark:bg-gray-900 border border-primary-200 dark:border-gray-700 px-2 py-1 rounded text-sm" placeholder="Company Nationality/Region" value={addForm.location||''} onChange={(e)=>setAddForm(f=>({...f,location:e.target.value}))} />
                                </td>
                                <td className="border-b border-r border-primary-200 dark:border-gray-700 px-2 py-1">
                                    <input className="w-full bg-white dark:bg-gray-900 border border-primary-200 dark:border-gray-700 px-2 py-1 rounded text-sm" placeholder="Company Primary Activity - Level 1" value={addForm.type||''} onChange={(e)=>setAddForm(f=>({...f,type:e.target.value}))} />
                                </td>
                                <td className="border-b border-r border-primary-200 dark:border-gray-700 px-2 py-1">
                                    <input className="w-full bg-white dark:bg-gray-900 border border-primary-200 dark:border-gray-700 px-2 py-1 rounded text-sm" placeholder="Company City" value={addForm.address||''} onChange={(e)=>setAddForm(f=>({...f,address:e.target.value}))} />
                                </td>
                                <td className="border-b border-r border-primary-200 dark:border-gray-700 px-2 py-1"></td>
                                <td className="border-b border-r border-primary-200 dark:border-gray-700 px-2 py-1"></td>
                                <td className="border-b border-r border-primary-200 dark:border-gray-700 px-2 py-1">
                                    <input className="w-full bg-white dark:bg-gray-900 border border-primary-200 dark:border-gray-700 px-2 py-1 rounded text-sm" placeholder="Company Website" value={addForm.website||''} onChange={(e)=>setAddForm(f=>({...f,website:e.target.value}))} />
                                </td>
                                <td className="border-b border-r border-primary-200 dark:border-gray-700 px-2 py-1"></td>
                                <td className="border-b border-r border-primary-200 dark:border-gray-700 px-2 py-1"></td>
                                <td className="border-b border-primary-200 dark:border-gray-700 px-2 py-1 text-right">
                                    <button className="text-xs px-2 py-1 bg-green-600 text-white rounded mr-2" onClick={async()=>{ if(!addForm.name.trim()) return; await handleCreateCompanySimple(addForm); setShowAdd(false); setAddForm({name:''}); }}>Add</button>
                                    <button className="text-xs px-2 py-1 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded" onClick={()=>{ setShowAdd(false); setAddForm({name:''}); }}>Cancel</button>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
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
