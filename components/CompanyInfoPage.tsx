
import { useData } from '../context/DataContext';
import React, { useState, useRef } from 'react';

const CompanyInfoPage: React.FC = () => {

    const { companies, projects, contacts } = useData();
    const [editing, setEditing] = useState<{ id: string; field: EditableField } | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [selected, setSelected] = useState<{ [id: string]: boolean }>({});

    // TODO: Replace with real update logic (API call, context update)
    const { handleUpdateCompany } = useData() as any;


    type EditableField = 'id' | 'name' | 'type' | 'location' | 'address' | 'website';

    // Resizable columns state
    // Excel-like: columns start as 'auto', user can resize to any width
    const [colWidths, setColWidths] = useState<{ [key: string]: number | undefined }>({
        name: undefined,
        type: undefined,
        location: undefined,
        address: undefined,
        website: undefined,
        previousOrders: undefined,
        vessels: undefined,
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
        await handleUpdateCompany({ ...company, [editing.field]: editValue });
        setEditing(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent, company: any) => {
        if (e.key === 'Enter') {
            saveEdit(company);
        } else if (e.key === 'Escape') {
            setEditing(null);
        }
    };

    return (
        <div className="flex flex-col h-full w-full m-0 p-0 bg-white dark:bg-gray-900">
            <div className="flex-1 overflow-x-auto m-0 p-0" style={{maxHeight: 'calc(100vh - 6rem)'}}>
                <table className="min-w-full w-full border-separate border-spacing-0 select-none table-fixed text-[13px]" style={{ fontFamily: 'Inter, Menlo, Monaco, Consolas, monospace', borderCollapse: 'separate' }}>
                    <colgroup>
                        <col style={{ width: 80 }} /> {/* ID */}
                        <col style={colWidths.name ? { width: colWidths.name } : {}} />
                        <col style={colWidths.type ? { width: colWidths.type } : {}} />
                        <col style={colWidths.location ? { width: colWidths.location } : {}} />
                        <col style={colWidths.address ? { width: colWidths.address } : {}} />
                        <col style={colWidths.website ? { width: colWidths.website } : {}} />
                        <col style={{ width: 80 }} /> {/* Projects count */}
                        <col style={colWidths.previousOrders ? { width: colWidths.previousOrders } : {}} /> {/* Previous Orders count */}
                        <col style={colWidths.vessels ? { width: colWidths.vessels } : {}} /> {/* No. Vessels */}
                        <col style={{ width: 80 }} /> {/* Contacts count */}
                    </colgroup>
                    <thead className="bg-primary-50 dark:bg-gray-800 sticky top-0 z-10">
                        <tr>
                            <th className="border-b border-r border-primary-200 dark:border-gray-700 bg-primary-50 dark:bg-gray-800 font-semibold text-left px-2 whitespace-nowrap group relative select-none" style={{ minWidth: 60 }}>
                                ID
                            </th>
                            <th className="border-b border-r border-primary-200 dark:border-gray-700 bg-primary-50 dark:bg-gray-800 font-semibold text-left px-2 whitespace-nowrap group relative select-none" style={{ minWidth: 80 }}>
                                Company Name
                                <span className="absolute right-0 top-0 h-full w-2 cursor-col-resize group-hover:bg-primary-100/30 dark:group-hover:bg-gray-700/30" onMouseDown={e => handleResizeStart('name', e)} style={{ zIndex: 30 }} />
                            </th>
                            <th className="border-b border-r border-primary-200 dark:border-gray-700 bg-primary-50 dark:bg-gray-800 font-semibold text-left px-2 whitespace-nowrap group relative select-none" style={{ minWidth: 80 }}>
                                Company Type
                                <span className="absolute right-0 top-0 h-full w-2 cursor-col-resize group-hover:bg-primary-100/30 dark:group-hover:bg-gray-700/30" onMouseDown={e => handleResizeStart('type', e)} style={{ zIndex: 30 }} />
                            </th>
                            <th className="border-b border-r border-primary-200 dark:border-gray-700 bg-primary-50 dark:bg-gray-800 font-semibold text-left px-2 whitespace-nowrap group relative select-none" style={{ minWidth: 80 }}>
                                Country
                                <span className="absolute right-0 top-0 h-full w-2 cursor-col-resize group-hover:bg-primary-100/30 dark:group-hover:bg-gray-700/30" onMouseDown={e => handleResizeStart('location', e)} style={{ zIndex: 30 }} />
                            </th>
                            <th className="border-b border-r border-primary-200 dark:border-gray-700 bg-primary-50 dark:bg-gray-800 font-semibold text-left px-2 whitespace-nowrap group relative select-none" style={{ minWidth: 80 }}>
                                Address
                                <span className="absolute right-0 top-0 h-full w-2 cursor-col-resize group-hover:bg-primary-100/30 dark:group-hover:bg-gray-700/30" onMouseDown={e => handleResizeStart('address', e)} style={{ zIndex: 30 }} />
                            </th>
                            <th className="border-b border-r border-primary-200 dark:border-gray-700 bg-primary-50 dark:bg-gray-800 font-semibold text-left px-2 whitespace-nowrap group relative select-none" style={{ minWidth: 80 }}>
                                Website
                                <span className="absolute right-0 top-0 h-full w-2 cursor-col-resize group-hover:bg-primary-100/30 dark:group-hover:bg-gray-700/30" onMouseDown={e => handleResizeStart('website', e)} style={{ zIndex: 30 }} />
                            </th>
                            <th className="border-b border-r border-primary-200 dark:border-gray-700 bg-primary-50 dark:bg-gray-800 font-semibold text-center px-2 whitespace-nowrap">Projects</th>
                            <th className="border-b border-r border-primary-200 dark:border-gray-700 bg-primary-50 dark:bg-gray-800 font-semibold text-center px-2 whitespace-nowrap group relative select-none">
                                Previous Orders
                                <span className="absolute right-0 top-0 h-full w-2 cursor-col-resize group-hover:bg-primary-100/30 dark:group-hover:bg-gray-700/30" onMouseDown={e => handleResizeStart('previousOrders', e)} style={{ zIndex: 30 }} />
                            </th>
                            <th className="border-b border-r border-primary-200 dark:border-gray-700 bg-primary-50 dark:bg-gray-800 font-semibold text-center px-2 whitespace-nowrap group relative select-none">
                                No. Vessels
                                <span className="absolute right-0 top-0 h-full w-2 cursor-col-resize group-hover:bg-primary-100/30 dark:group-hover:bg-gray-700/30" onMouseDown={e => handleResizeStart('vessels', e)} style={{ zIndex: 30 }} />
                            </th>
                            <th className="border-b border-primary-200 dark:border-gray-700 bg-primary-50 dark:bg-gray-800 font-semibold text-center px-2 whitespace-nowrap">Contacts</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900">
                        {companies.map((company) => {
                            // Count unique opportunity numbers for projects tied to this company name
                            const oppNos = new Set(
                                projects.filter(p => {
                                    const companyNames = [p.shipyardId, p.vesselOwnerId, p.designCompanyId]
                                        .map(id => companies.find(c => c.id === id)?.name)
                                        .filter(Boolean);
                                    return companyNames.includes(company.name);
                                }).map(p => p.opportunityNumber)
                            );
                            const projectCount = oppNos.size;

                            // Count unique order numbers for projects tied to this company name
                            const orderNos = new Set(
                                projects.filter(p => {
                                    const companyNames = [p.shipyardId, p.vesselOwnerId, p.designCompanyId]
                                        .map(id => companies.find(c => c.id === id)?.name)
                                        .filter(Boolean);
                                    return companyNames.includes(company.name);
                                }).map(p => p.orderNumber).filter(Boolean)
                            );
                            const previousOrderCount = orderNos.size;

                            // Sum numberOfVessels for all projects tied to this company name
                            const vesselsSum = projects.filter(p => {
                                const companyNames = [p.shipyardId, p.vesselOwnerId, p.designCompanyId]
                                    .map(id => companies.find(c => c.id === id)?.name)
                                    .filter(Boolean);
                                return companyNames.includes(company.name);
                            }).reduce((sum, p) => sum + (p.numberOfVessels || 0), 0);
                            const contactCount = contacts.filter(c => c.companyId === company.id).length;
                            return (
                                <tr key={company.id} className="hover:bg-primary-50 dark:hover:bg-gray-800 transition-colors">
                                    <td className="border-b border-r border-primary-200 dark:border-gray-700 px-2 py-1 font-mono text-xs text-gray-500 dark:text-gray-400 cursor-pointer" title={company.id} onClick={() => startEdit(company.id, 'id', company.id)}>
                                        {editing && editing.id === company.id && editing.field === 'id' ? (
                                            <input className="w-full bg-transparent border-b border-primary-400 focus:outline-none text-gray-900 dark:text-gray-100 font-mono text-[13px]" value={editValue} autoFocus onChange={e => setEditValue(e.target.value)} onBlur={() => saveEdit(company)} onKeyDown={e => handleKeyDown(e, company)} />
                                        ) : (
                                            company.id
                                        )}
                                    </td>
                                    <td className="border-b border-r border-primary-200 dark:border-gray-700 px-2 py-1 text-gray-900 dark:text-gray-100 font-normal cursor-pointer truncate max-w-[220px]" title={company.name} onClick={() => startEdit(company.id, 'name', company.name)}>
                                        {editing && editing.id === company.id && editing.field === 'name' ? (
                                            <input className="w-full bg-transparent border-b border-primary-400 focus:outline-none text-gray-900 dark:text-gray-100 font-mono text-[13px]" value={editValue} autoFocus onChange={e => setEditValue(e.target.value)} onBlur={() => saveEdit(company)} onKeyDown={e => handleKeyDown(e, company)} />
                                        ) : (
                                            company.name
                                        )}
                                    </td>
                                    <td className="border-b border-r border-primary-200 dark:border-gray-700 px-2 py-1 cursor-pointer" onClick={() => startEdit(company.id, 'type', company.type)}>
                                        {editing && editing.id === company.id && editing.field === 'type' ? (
                                            <input className="w-full bg-transparent border-b border-primary-400 focus:outline-none text-gray-900 dark:text-gray-100 font-mono text-[13px]" value={editValue} autoFocus onChange={e => setEditValue(e.target.value)} onBlur={() => saveEdit(company)} onKeyDown={e => handleKeyDown(e, company)} />
                                        ) : (
                                            <span className={
                                                company.type === 'Shipping' ? 'bg-primary-600 text-white px-2 py-0.5 rounded-full text-xs font-semibold' :
                                                company.type === 'Shipyard' ? 'bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-semibold' :
                                                'bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs font-semibold'
                                            }>{company.type}</span>
                                        )}
                                    </td>
                                    <td className="border-b border-r border-primary-200 dark:border-gray-700 px-2 py-1 cursor-pointer truncate max-w-[120px]" title={company.location} onClick={() => startEdit(company.id, 'location', company.location)}>
                                        {editing && editing.id === company.id && editing.field === 'location' ? (
                                            <input className="w-full bg-transparent border-b border-primary-400 focus:outline-none text-gray-900 dark:text-gray-100 font-mono text-[13px]" value={editValue} autoFocus onChange={e => setEditValue(e.target.value)} onBlur={() => saveEdit(company)} onKeyDown={e => handleKeyDown(e, company)} />
                                        ) : (
                                            company.location
                                        )}
                                    </td>
                                    <td className="border-b border-r border-primary-200 dark:border-gray-700 px-2 py-1 cursor-pointer truncate max-w-[160px]" title={company.address} onClick={() => startEdit(company.id, 'address', company.address)}>
                                        {editing && editing.id === company.id && editing.field === 'address' ? (
                                            <input className="w-full bg-transparent border-b border-primary-400 focus:outline-none text-gray-900 dark:text-gray-100 font-mono text-[13px]" value={editValue} autoFocus onChange={e => setEditValue(e.target.value)} onBlur={() => saveEdit(company)} onKeyDown={e => handleKeyDown(e, company)} />
                                        ) : (
                                            company.address
                                        )}
                                    </td>
                                    <td className="border-b border-r border-primary-200 dark:border-gray-700 px-2 py-1 cursor-pointer truncate max-w-[160px] text-primary-700 dark:text-blue-300 underline" title={company.website} onClick={() => startEdit(company.id, 'website', company.website)}>
                                        {editing && editing.id === company.id && editing.field === 'website' ? (
                                            <input className="w-full bg-transparent border-b border-primary-400 focus:outline-none text-gray-900 dark:text-gray-100 font-mono text-[13px]" value={editValue} autoFocus onChange={e => setEditValue(e.target.value)} onBlur={() => saveEdit(company)} onKeyDown={e => handleKeyDown(e, company)} />
                                        ) : (
                                            company.website ? <a href={company.website} target="_blank" rel="noopener noreferrer" className="hover:underline">{company.website.length > 30 ? company.website.slice(0, 28) + '…' : company.website}</a> : ''
                                        )}
                                    </td>
                                    <td className="border-b border-r border-primary-200 dark:border-gray-700 px-2 py-1 text-center text-primary-700 dark:text-blue-300 font-semibold cursor-pointer hover:underline" title="View projects" onClick={() => {/* TODO: navigate to filtered projects */}}>
                                        {projectCount}
                                    </td>
                                    <td className="border-b border-r border-primary-200 dark:border-gray-700 px-2 py-1 text-center text-primary-700 dark:text-blue-300 font-semibold cursor-pointer" title="View previous orders">
                                        {previousOrderCount}
                                    </td>
                                    <td className="border-b border-r border-primary-200 dark:border-gray-700 px-2 py-1 text-center text-primary-700 dark:text-blue-300 font-semibold cursor-pointer" title="Total vessels for all projects">
                                        {vesselsSum}
                                    </td>
                                    <td className="border-b border-primary-200 dark:border-gray-700 px-2 py-1 text-center text-primary-700 dark:text-blue-300 font-semibold cursor-pointer hover:underline" title="View contacts" onClick={() => {/* TODO: navigate to filtered contacts */}}>
                                        {contactCount}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="flex items-center justify-between px-4 py-2 border-t border-primary-200 dark:border-gray-700 bg-primary-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-300">
                <span>{companies.length} companies</span>
                <button className="flex items-center gap-1 px-2 py-1 bg-primary-50 dark:bg-gray-800 border border-primary-200 dark:border-gray-700 rounded hover:bg-primary-100 dark:hover:bg-gray-700 text-primary-700 dark:text-blue-300 text-xs font-medium">
                    <span className="text-lg leading-none">+</span> Add…
                </button>
            </div>
        </div>
    );
};

export default CompanyInfoPage;
