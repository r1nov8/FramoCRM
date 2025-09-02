import React, { useRef, useState, useMemo, useEffect } from 'react';
import type { Project, Company, Contact, TeamMember, ProjectFile } from '../types';
import type { Task, Activity } from '../types';
import { INITIAL_COMPANIES } from '../constants';
import { ProjectStage, Currency, ProjectType } from '../types';
import { CompanyCard } from './CompanyCard';
import { ContactCard } from './ContactCard';
import { ProductInfo } from './ProductInfo';
import { PencilIcon, DollarIcon, PercentIcon, UploadIcon, DownloadIcon, TrashIcon, FileIcon, FileDocIcon, FilePdfIcon, CalculatorIcon, WrenchScrewdriverIcon } from './icons';
import { useData } from '../context/DataContext';

interface ProjectDetailsProps {
    project: Project;
    companies: Company[];
    contacts: Contact[];
    teamMembers: TeamMember[];
    onEditProject: () => void;
    onUploadFiles: (projectId: string, files: FileList) => void;
    onDeleteFile: (projectId: string, fileId: string) => void;
    onOpenHPUSizing: () => void;
    onOpenEstimateCalculator: () => void;
    isActive?: boolean;
    onOpenActivity: (projectId: string) => void;
}

const getCurrencySymbol = (currency: Currency): string => {
    switch (currency) {
        case Currency.USD: return '$';
        case Currency.EUR: return '€';
        case Currency.NOK: return 'kr';
        case Currency.JPY: return '¥';
        case Currency.KRW: return '₩';
        default: return '$';
    }
};

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (fileType: string): React.ReactNode => {
    if (fileType.includes('pdf')) return <FilePdfIcon className="w-8 h-8 text-red-500" />;
    if (fileType.includes('word')) return <FileDocIcon className="w-8 h-8 text-blue-500" />;
    return <FileIcon className="w-8 h-8 text-gray-500" />;
};

const stageProgress: { [key in ProjectStage]: number } = {
    [ProjectStage.LEAD]: 1,
    [ProjectStage.OPP]: 2,
    [ProjectStage.RFQ]: 3,
    [ProjectStage.QUOTE]: 4,
    [ProjectStage.PO]: 5,
    [ProjectStage.ORDER_CONFIRMATION]: 6,
    [ProjectStage.WON]: 7,
    [ProjectStage.LOST]: 7,
    [ProjectStage.CANCELLED]: 7,
};

const stages = [ProjectStage.LEAD, ProjectStage.OPP, ProjectStage.RFQ, ProjectStage.QUOTE, ProjectStage.PO, ProjectStage.ORDER_CONFIRMATION, ProjectStage.WON];

export const ProjectDetails: React.FC<ProjectDetailsProps> = ({ project, companies, contacts, teamMembers, onEditProject, onUploadFiles, onDeleteFile, onOpenHPUSizing, onOpenEstimateCalculator, isActive = false, onOpenActivity }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { tasksByProject, handleAddTask, handleUpdateTask, handleDeleteTask, teamMembers: dataTeamMembers, activitiesByProject, handleAddActivity, saveProjectEstimate, generateProjectQuote, generateProjectQuotePdf, updateProjectFields, projectMembersByProject, addProjectMember, removeProjectMember, reloadProjectMembers, reloadTeamMembers } = useData();
    const projectMembers = projectMembersByProject?.[project.id] || [];
    const [newMemberId, setNewMemberId] = useState<string>('');
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [taskFilter, setTaskFilter] = useState<'all' | 'open' | 'done' | 'overdue' | 'dueSoon'>('all');
    // Activity panel managed at App level
    
    const findCompany = (id: string) =>
        companies.find(c => String(c.id) === String(id)) ||
        INITIAL_COMPANIES.find(c => String(c.id) === String(id));
    const findContact = (id: string) => contacts.find(c => c.id === id);
    // Ensure team and members for this project are loaded (don’t rely only on global selected project)
    useEffect(() => {
        try {
            if (!dataTeamMembers || dataTeamMembers.length === 0) {
                reloadTeamMembers?.();
            }
        } catch {}
        try {
            const current = projectMembersByProject?.[project.id];
            if (!current || current.length === 0) {
                reloadProjectMembers?.(project.id);
            }
        } catch {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project.id]);

    const salesRep = useMemo(() => {
        if (!project.salesRepId) return undefined;
        const idStr = String(project.salesRepId);
        return (
            projectMembers.find(tm => String(tm.id) === idStr)
            || dataTeamMembers.find(tm => String(tm.id) === idStr)
            || teamMembers.find(tm => String(tm.id) === idStr)
        );
    }, [project.salesRepId, projectMembers, dataTeamMembers, teamMembers]);

    const shipyard = findCompany(project.shipyardId);
    const vesselOwner = project.vesselOwnerId ? findCompany(project.vesselOwnerId) : undefined;
    const designCompany = project.designCompanyId ? findCompany(project.designCompanyId) : undefined;
    const primaryContact = project.primaryContactId ? findContact(project.primaryContactId) : undefined;

    const currentStageIndex = stageProgress[project.stage] ?? 1;
    const currencySymbol = getCurrencySymbol(project.currency);

    const progressColor =
        project.stage === ProjectStage.WON ? 'bg-green-600' :
        project.stage === ProjectStage.LOST ? 'bg-red-600' :
        project.stage === ProjectStage.CANCELLED ? 'bg-gray-500' :
        'bg-blue-600';

    const progressTextColor =
        project.stage === ProjectStage.WON ? 'font-semibold text-green-600 dark:text-green-400' :
        project.stage === ProjectStage.LOST ? 'font-semibold text-red-600 dark:text-red-400' :
        project.stage === ProjectStage.CANCELLED ? 'font-semibold text-gray-500 dark:text-gray-400' :
        'font-semibold text-blue-600 dark:text-blue-400';
    
    const stageShortNames: { [key in ProjectStage]?: string } = {
        [ProjectStage.RFQ]: 'RFQ',
        [ProjectStage.PO]: 'PO',
        [ProjectStage.ORDER_CONFIRMATION]: 'Confirm',
    };

    const showGrossMargin = project.grossMarginPercent !== undefined && [ProjectStage.QUOTE, ProjectStage.PO, ProjectStage.ORDER_CONFIRMATION, ProjectStage.WON].includes(project.stage);
    const showHedgeCurrency = project.hedgeCurrency && [ProjectStage.ORDER_CONFIRMATION, ProjectStage.WON, ProjectStage.LOST, ProjectStage.CANCELLED].includes(project.stage);
    
    // Always show tools to make calculators accessible at any stage
    const showTools = true;

    // Fallback: read flow from last saved estimator state if project doesn't have it yet
    const flowFallback = useMemo(() => {
        const hasProjectFlow = !!(project.flowDescription || project.flowCapacityM3h || project.flowMwc || project.flowPowerKw);
        if (hasProjectFlow) return null;
        try {
            const key = `estimator_state_${project.id}`;
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const s = JSON.parse(raw);
            const f = s && s.flow;
            if (!f) return null;
            const cap = f.capacityM3h ?? null;
            const mwc = f.mwc ?? null;
            const kw = f.powerKw ?? null;
            const desc = (typeof f.description === 'string' && f.description.trim()) ? f.description.trim() : null;
            if (desc || cap != null || mwc != null || kw != null) {
                return { description: desc, capacityM3h: cap, mwc, powerKw: kw } as { description: string | null; capacityM3h: number | null; mwc: number | null; powerKw: number | null };
            }
        } catch {}
        return null;
    }, [project.id, project.flowDescription, project.flowCapacityM3h, project.flowMwc, project.flowPowerKw]);

    // Quick-compare state
    const [compareOpen, setCompareOpen] = useState(false);
    const [compareInfo, setCompareInfo] = useState<{ prev: number; curr: number; priceDiff: number; flowDelta: string[] } | null>(null);

    // Compute a compact hash of relevant estimator parts
    const summarizeEstimator = (obj: any) => {
        const data = obj || {};
        const price = Number(data?.pricePerVessel || 0);
        const flow = data?.flow || {};
        const cap = flow?.capacityM3h ?? null;
        const mwc = flow?.mwc ?? null;
        const kw = flow?.powerKw ?? null;
        const desc = typeof flow?.description === 'string' ? flow.description.trim() : '';
        return { price, flow: { cap, mwc, kw, desc } };
    };

    const diffFlow = (a: any, b: any): string[] => {
        const lines: string[] = [];
        const pairs: Array<[string, any, any, (v:any)=>string]> = [
            ['Capacity (m3/h)', a?.cap, b?.cap, (v)=> v==null? '—' : String(v)],
            ['Head (mwc)', a?.mwc, b?.mwc, (v)=> v==null? '—' : String(v)],
            ['Power (kW)', a?.kw, b?.kw, (v)=> v==null? '—' : String(v)],
            ['Description', a?.desc, b?.desc, (v)=> (v||'').toString()]
        ];
        for (const [label, av, bv, fmt] of pairs) {
            const aStr = fmt(av);
            const bStr = fmt(bv);
            if (aStr !== bStr) lines.push(`${label}: ${aStr} → ${bStr}`);
        }
        return lines;
    };

    const handleGenerateQuote = async () => {
        try {
            // Try to read estimator state saved by the modal
            const key = `estimator_state_${project.id}`;
            let payload: any = null;
            try { const raw = localStorage.getItem(key); if (raw) payload = JSON.parse(raw); } catch {}
            // Also look for a previous snapshot to quick-compare
            let prev: any = null;
            try { const raw = localStorage.getItem(`${key}_prev`); if (raw) prev = JSON.parse(raw); } catch {}
            const currSummary = summarizeEstimator(payload || {});
            const prevSummary = summarizeEstimator(prev || {});
            if (payload) {
                // Persist current as prev snapshot for next time
                try { localStorage.setItem(`${key}_prev`, JSON.stringify(payload)); } catch {}
            }
            // If we have a previous snapshot, show a tiny diff preview first
            if (prev && payload) {
                const priceDiff = Number(currSummary.price || 0) - Number(prevSummary.price || 0);
                const flowDelta = diffFlow(prevSummary.flow, currSummary.flow);
                setCompareInfo({ prev: Number(prevSummary.price||0), curr: Number(currSummary.price||0), priceDiff, flowDelta });
                setCompareOpen(true);
                // Defer actual generation until user confirms
                return;
            }
            // If flow info exists in estimator payload, patch project first so backend has it when composing the quote
            if (payload && payload.flow) {
                const f = payload.flow as any;
                const patch: any = {};
                if (f.description) patch.flowDescription = f.description;
                if (f.capacityM3h !== undefined && f.capacityM3h !== null) patch.flowCapacityM3h = Number(f.capacityM3h);
                if (f.mwc !== undefined && f.mwc !== null) patch.flowMwc = Number(f.mwc);
                if (f.powerKw !== undefined && f.powerKw !== null) patch.flowPowerKw = Number(f.powerKw);
                if (Object.keys(patch).length > 0) {
                    try { await updateProjectFields(project.id, patch); } catch {}
                }
            }
            if (payload && typeof payload === 'object') {
                try { await saveProjectEstimate(project.id, 'anti_heeling', payload); } catch (e) { console.warn('Save estimate failed (continuing):', e); }
            }
            const file = await generateProjectQuote(project.id, 'anti_heeling');
            if (file) {
                alert('Quote generated and added to Documents.');
            }
        } catch (e: any) {
            alert(`Failed to generate quote: ${e?.message || 'Unknown error'}`);
        }
    };

    const handleGenerateQuotePdf = async () => {
        try {
            const key = `estimator_state_${project.id}`;
            let payload: any = null;
            try { const raw = localStorage.getItem(key); if (raw) payload = JSON.parse(raw); } catch {}
            if (payload && payload.flow) {
                const f = payload.flow as any; const patch: any = {};
                if (f.description) patch.flowDescription = f.description;
                if (f.capacityM3h != null) patch.flowCapacityM3h = Number(f.capacityM3h);
                if (f.mwc != null) patch.flowMwc = Number(f.mwc);
                if (f.powerKw != null) patch.flowPowerKw = Number(f.powerKw);
                if (Object.keys(patch).length) { try { await updateProjectFields(project.id, patch); } catch {} }
            }
            if (payload && typeof payload === 'object') {
                try { await saveProjectEstimate(project.id, 'anti_heeling', payload); } catch {}
            }
            const file = await generateProjectQuotePdf(project.id, 'anti_heeling');
            if (file) alert('PDF quote generated and added to Documents.');
        } catch (e:any) {
            alert(`Failed to generate PDF quote: ${e?.message || 'Unknown error'}`);
        }
    };


    const handleFileUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            onUploadFiles(project.id, event.target.files);
        }
    };

    const handleFileDownload = async (file: ProjectFile) => {
        try {
            const token = localStorage.getItem('token');
            const apiBase = (window as any).API_URL || `${window.location.origin}`;
            const res = await fetch(`${apiBase}/api/project-files/${file.id}/download`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (!res.ok) throw new Error('Download failed');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (e: any) {
            // Fallback to base64 if available in state
            try {
                const link = document.createElement('a');
                link.href = `data:${file.type};base64,${file.content}`;
                link.download = file.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } catch {}
        }
    };
    
    const isPriceEstimated = project.pricePerVessel !== undefined && project.pricePerVessel > 0;
    const perVesselSelfCost = project.selfCostPerVessel && project.selfCostPerVessel > 0 ? project.selfCostPerVessel : undefined;
    const grossMarginPct = useMemo(() => {
        if (perVesselSelfCost === undefined || !isPriceEstimated) return undefined;
        const gm = ((project.pricePerVessel! - perVesselSelfCost) / project.pricePerVessel!) * 100;
        return Math.round(gm);
    }, [perVesselSelfCost, isPriceEstimated, project.pricePerVessel]);

    return (
        <>
        <div className="space-y-6 mt-0">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                            <span>{project.projectType === ProjectType.ANTI_HEELING ? 'Project No' : 'Opp. No'}: <span className="font-semibold text-gray-700 dark:text-gray-300">{project.opportunityNumber}</span></span>
                             {project.orderNumber && <span className="border-l border-gray-300 dark:border-gray-600 pl-4">Order No: <span className="font-semibold text-gray-700 dark:text-gray-300">{project.orderNumber}</span></span>}
                        </div>
                        <p className="text-lg text-gray-600 dark:text-gray-300 mt-2">
                            Value: {isPriceEstimated ? 
                                <span className="font-semibold text-blue-600 dark:text-blue-400">{currencySymbol}{project.value.toLocaleString()} {project.currency}</span>
                                : <span className="font-semibold text-gray-500 dark:text-gray-400 italic">To be estimated</span>
                            }
                        </p>
                         <p className="text-sm text-gray-500 dark:text-gray-400">Closing Date: {new Date(project.closingDate).toLocaleDateString()}</p>
                    </div>
                     <div className="text-right">
                         <div className="flex items-center justify-end space-x-2">
                             <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                                project.stage === ProjectStage.WON ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                project.stage === ProjectStage.LOST ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                                project.stage === ProjectStage.CANCELLED ? 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                                'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                            }`}>{project.stage}</span>
                            <button 
                                onClick={onEditProject} 
                                className="p-2 text-gray-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-label="Edit Project"
                            >
                                <PencilIcon className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => onOpenActivity(project.id)}
                                className="px-3 py-1.5 text-sm rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                                aria-label="View Activity"
                            >
                                View Activity
                            </button>
                        </div>
                        {salesRep ? (
                            <div className="flex items-center justify-end mt-2">
                                <div className="text-right mr-2">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{`${salesRep.first_name} ${salesRep.last_name}`.trim()}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{salesRep.jobTitle}</p>
                                </div>
                                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                    {salesRep.initials}
                                </div>
                            </div>
                        ) : project.salesRepId ? (
                            <div className="flex items-center justify-end mt-2">
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading…</span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-end mt-2">
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Unassigned</span>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="mt-6">
                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">Project Progress</h3>
                    <div className="flex items-center">
                        {stages.map((stage, index) => (
                            <React.Fragment key={stage}>
                                <div className="flex flex-col items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${index + 1 <= currentStageIndex ? progressColor : 'bg-gray-300 dark:bg-gray-600'}`}>
                                        {index + 1}
                                    </div>
                                    <p className={`mt-2 text-xs text-center w-20 ${index + 1 <= currentStageIndex ? progressTextColor : 'text-gray-500'}`}>{stageShortNames[stage] || stage}</p>
                                </div>
                                {index < stages.length - 1 && <div className={`flex-1 h-1 mx-2 ${index + 1 < currentStageIndex ? progressColor : 'bg-gray-300 dark:bg-gray-600'}`}></div>}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 flex flex-col gap-6">
                                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                                                <div className="flex items-start justify-between mb-4">
                                                    <h2 className="text-xl font-semibold">Products & Specifications</h2>
                                                    <button
                                                        onClick={onOpenEstimateCalculator}
                                                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                                        title="Edit in Estimation Calculator"
                                                    >Edit in estimator</button>
                                                </div>
                        <div className="space-y-3">
                            <div className="text-sm text-gray-600 dark:text-gray-400">System Type</div>
                            <div className="font-semibold text-gray-800 dark:text-gray-200 mb-3">{project.projectType || '—'}</div>
                            {project.products.map((product, index) => (
                                <ProductInfo key={index} product={product} />
                            ))}
                            {(project.flowDescription || project.flowCapacityM3h || project.flowMwc || project.flowPowerKw || flowFallback) && (
                                <div className="mt-2 pt-3 border-t dark:border-gray-700">
                                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Flow Specification</div>
                                    <div className="font-semibold text-gray-800 dark:text-gray-200">
                                        {project.flowDescription
                                            ? project.flowDescription
                                            : (
                                                flowFallback && !project.flowCapacityM3h && !project.flowMwc && !project.flowPowerKw
                                                    ? (
                                                        flowFallback.description || `${flowFallback.capacityM3h ?? '—'} m3/h @ ${flowFallback.mwc ?? '—'} mwc @ ${flowFallback.powerKw ?? '—'} kW`
                                                    )
                                                    : `${project.flowCapacityM3h ?? '—'} m3/h @ ${project.flowMwc ?? '—'} mwc @ ${project.flowPowerKw ?? '—'} kW`
                                            )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {showTools && (
                         <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                            <h2 className="text-xl font-semibold mb-4 flex items-center"><WrenchScrewdriverIcon className="w-6 h-6 mr-2 text-gray-500" /> Tools & Analysis</h2>
                            <div className="flex flex-wrap gap-4">
                                <div className="flex-1 min-w-[200px] p-4 border dark:border-gray-700 rounded-lg flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                                    <div>
                                        <h3 className="font-semibold flex items-center"><CalculatorIcon className="w-5 h-5 mr-2 text-gray-500" /> Estimate Calculator</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Create a detailed cost estimate.</p>
                                    </div>
                                    <button 
                                        onClick={onOpenEstimateCalculator}
                                        className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
                                    >
                                        Open
                                    </button>
                                </div>
                                {project.stage === ProjectStage.QUOTE && (
                                    <div className="flex-1 min-w-[200px] p-4 border dark:border-gray-700 rounded-lg flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                                        <div>
                                            <h3 className="font-semibold flex items-center"><FileDocIcon className="w-5 h-5 mr-2 text-gray-500" /> Generate Quote</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Review last changes, save estimator and create a draft quote.</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={handleGenerateQuote}
                                                className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800"
                                            >
                                                Generate
                                            </button>
                                            <button 
                                                onClick={handleGenerateQuotePdf}
                                                className="px-3 py-1.5 text-sm font-medium text-white bg-rose-600 rounded-md hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 dark:focus:ring-offset-gray-800"
                                                title="Generate PDF via HTML template"
                                            >
                                                PDF
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <div className="flex-1 min-w-[200px] p-4 border dark:border-gray-700 rounded-lg flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                                    <div>
                                    {/* Quick Compare Modal (lightweight) */}
                                    {compareOpen && compareInfo && (
                                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                                            <div className="bg-white dark:bg-gray-800 rounded-md shadow-lg w-full max-w-md p-4">
                                                <h3 className="text-lg font-semibold mb-2">Quick compare</h3>
                                                <div className="text-sm space-y-2">
                                                    <div className="flex justify-between">
                                                        <span>Price per vessel</span>
                                                        <span className="font-medium">{compareInfo.prev.toLocaleString()} → {compareInfo.curr.toLocaleString()} ({compareInfo.priceDiff >= 0 ? '+' : ''}{compareInfo.priceDiff.toLocaleString()})</span>
                                                    </div>
                                                    {compareInfo.flowDelta.length > 0 ? (
                                                        <div>
                                                            <div className="text-gray-600 dark:text-gray-400">Spec changes</div>
                                                            <ul className="list-disc pl-5 mt-1 text-gray-800 dark:text-gray-200">
                                                                {compareInfo.flowDelta.map((l, i) => (<li key={i}>{l}</li>))}
                                                            </ul>
                                                        </div>
                                                    ) : (
                                                        <div className="text-gray-600 dark:text-gray-400">No spec changes</div>
                                                    )}
                                                </div>
                                                <div className="flex justify-end gap-2 mt-4">
                                                    <button
                                                        className="px-3 py-1.5 text-sm rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                                                        onClick={() => { setCompareOpen(false); }}
                                                    >Cancel</button>
                                                    <button
                                                        className="px-3 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700"
                                                        onClick={async ()=>{
                                                            setCompareOpen(false);
                                                            // Re-run generation flow quickly
                                                            try {
                                                                const key = `estimator_state_${project.id}`;
                                                                let payload: any = null; try { const raw = localStorage.getItem(key); if (raw) payload = JSON.parse(raw); } catch {}
                                                                if (payload && payload.flow) {
                                                                    const f = payload.flow as any; const patch: any = {};
                                                                    if (f.description) patch.flowDescription = f.description;
                                                                    if (f.capacityM3h != null) patch.flowCapacityM3h = Number(f.capacityM3h);
                                                                    if (f.mwc != null) patch.flowMwc = Number(f.mwc);
                                                                    if (f.powerKw != null) patch.flowPowerKw = Number(f.powerKw);
                                                                    if (Object.keys(patch).length) { try { await updateProjectFields(project.id, patch); } catch {} }
                                                                }
                                                                if (payload && typeof payload === 'object') {
                                                                    try { await saveProjectEstimate(project.id, 'anti_heeling', payload); } catch {}
                                                                }
                                                                const file = await generateProjectQuote(project.id, 'anti_heeling');
                                                                if (file) alert('Quote generated and added to Documents.');
                                                            } catch (e:any) {
                                                                alert(`Failed to generate quote: ${e?.message || 'Unknown error'}`);
                                                            }
                                                        }}
                                                    >Generate now</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                        <h3 className="font-semibold flex items-center"><CalculatorIcon className="w-5 h-5 mr-2 text-gray-500" /> HPU Sizing</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Calculate hydraulic power unit size.</p>
                                    </div>
                                    <button 
                                        onClick={onOpenHPUSizing}
                                        className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                                    >
                                        Open
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tasks & Reminders */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-xl font-semibold">Tasks & Reminders</h2>
                            <div className="flex items-center gap-3">
                                <select
                                    className="px-2 py-1 text-sm rounded border dark:border-gray-700 bg-white dark:bg-gray-900"
                                    value={taskFilter}
                                    onChange={(e)=> setTaskFilter(e.target.value as any)}
                                    title="Filter tasks"
                                >
                                    <option value="all">All</option>
                                    <option value="open">Open</option>
                                    <option value="done">Done</option>
                                    <option value="overdue">Overdue</option>
                                    <option value="dueSoon">Due soon (7d)</option>
                                </select>
                                <input
                                    value={newTaskTitle}
                                    onChange={(e)=>setNewTaskTitle(e.target.value)}
                                    placeholder="New task title"
                                    className="px-2 py-1 text-sm rounded border dark:border-gray-700 bg-white dark:bg-gray-900"
                                />
                                <button
                                    onClick={async()=>{
                                        if (!newTaskTitle.trim()) return;
                                        try {
                                            await handleAddTask(project.id, { title: newTaskTitle.trim() });
                                            setNewTaskTitle('');
                                        } catch (e: any) {
                                            alert(`Failed to add task: ${e?.message || 'Unknown error'}`);
                                        }
                                    }}
                                    className="px-2 py-1 text-sm rounded bg-blue-600 text-white"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {useMemo(()=>{
                                const now = new Date();
                                const soon = new Date();
                                soon.setDate(now.getDate() + 7);
                                let list = (tasksByProject?.[project.id] || []) as Task[];
                                if (taskFilter === 'open') list = list.filter(t => t.status !== 'done');
                                if (taskFilter === 'done') list = list.filter(t => t.status === 'done');
                                if (taskFilter === 'overdue') list = list.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done');
                                if (taskFilter === 'dueSoon') list = list.filter(t => t.dueDate && new Date(t.dueDate) >= now && new Date(t.dueDate) <= soon && t.status !== 'done');
                                // Sort: overdue first, then by due date asc, then by id desc
                                list = [...list].sort((a,b)=>{
                                    const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                                    const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                                    return ad - bd || Number(b.id) - Number(a.id);
                                });
                                return list;
                            }, [tasksByProject, project.id, taskFilter]).map((t: Task) => {
                                const overdue = t.dueDate ? new Date(t.dueDate) < new Date() && t.status !== 'done' : false;
                                return (
                                    <div key={t.id} className="flex items-center justify-between p-2 rounded border dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <input
                                                type="checkbox"
                                                checked={t.status === 'done'}
                                                onChange={() => handleUpdateTask(t.id, { projectId: project.id, status: t.status === 'done' ? 'open' : 'done' })}
                                            />
                                            <span className={`text-sm truncate ${t.status === 'done' ? 'line-through text-gray-500' : 'text-gray-800 dark:text-gray-100'}`}>{t.title}</span>
                                            {t.dueDate && (
                                                <span className={`text-xs ${overdue ? 'text-red-600' : 'text-gray-500'}`}>
                                                    Due {new Date(t.dueDate).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {/* Status selector */}
                                            <select
                                                className="text-xs px-2 py-1 rounded border dark:border-gray-700 bg-white dark:bg-gray-900"
                                                value={t.status}
                                                onChange={(e)=> handleUpdateTask(t.id, { projectId: project.id, status: e.target.value as any })}
                                                title="Status"
                                            >
                                                <option value="open">Open</option>
                                                <option value="wip">In progress</option>
                                                <option value="blocked">Blocked</option>
                                                <option value="done">Done</option>
                                            </select>
                                            {/* Due date */}
                                            <input
                                                type="date"
                                                className="text-xs px-2 py-1 rounded border dark:border-gray-700 bg-white dark:bg-gray-900"
                                                value={t.dueDate || ''}
                                                onChange={(e)=> handleUpdateTask(t.id, { projectId: project.id, dueDate: e.target.value || null })}
                                                title="Due date"
                                            />
                                            {/* Assignee */}
                                            <select
                                                className="text-xs px-2 py-1 rounded border dark:border-gray-700 bg-white dark:bg-gray-900"
                                                value={t.assignedTo || ''}
                                                onChange={(e)=> handleUpdateTask(t.id, { projectId: project.id, assignedTo: e.target.value || null })}
                                                title="Assignee"
                                            >
                                                <option value="">Unassigned</option>
                                                {dataTeamMembers.map(m => (
                                                    <option key={m.id} value={m.id}>{m.initials} - {m.first_name} {m.last_name}</option>
                                                ))}
                                            </select>
                                            {/* Priority */}
                                            <select
                                                className="text-xs px-2 py-1 rounded border dark:border-gray-700 bg-white dark:bg-gray-900"
                                                value={t.priority || 2}
                                                onChange={(e)=> handleUpdateTask(t.id, { projectId: project.id, priority: Number(e.target.value) as 1|2|3 })}
                                                title="Priority"
                                            >
                                                <option value={1}>High</option>
                                                <option value={2}>Normal</option>
                                                <option value={3}>Low</option>
                                            </select>
                                            <button
                                                onClick={() => handleDeleteTask(project.id, t.id)}
                                                className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            {!(tasksByProject?.[project.id] || []).length && (
                                <p className="text-sm text-gray-500">No tasks yet.</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                        <div className="flex justify-between items-center mb-4">
                             <h2 className="text-xl font-semibold flex items-center"><FileIcon className="w-6 h-6 mr-2 text-gray-500" /> Documents</h2>
                             <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
                             <button 
                                onClick={handleFileUploadClick}
                                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
                            >
                                <UploadIcon className="w-5 h-5" />
                                <span>Upload</span>
                            </button>
                        </div>
                        <div className="space-y-3">
                            {project.files && project.files.length > 0 ? (
                                project.files.map(file => (
                                    <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                                        <div className="flex items-center space-x-3 flex-1 overflow-hidden">
                                            {getFileIcon(file.type)}
                                            <div>
                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate" title={file.name}>{file.name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2 ml-4">
                                            <button onClick={() => handleFileDownload(file)} className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400" aria-label="Download file">
                                                <DownloadIcon className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => onDeleteFile(project.id, file.id)} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400" aria-label="Delete file">
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No documents uploaded yet.</p>
                            )}
                        </div>
                    </div>

                    {/* Team Assignment */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">Project Team</h2>
                            <div className="flex items-center gap-2">
                                <select
                                    className="px-2 py-1 text-sm rounded border dark:border-gray-700 bg-white dark:bg-gray-900"
                                    value={newMemberId}
                                    onChange={(e)=> setNewMemberId(e.target.value)}
                                >
                                    <option value="">Add member…</option>
                                    {dataTeamMembers.filter(m => !projectMembers.find(pm => pm.id === m.id)).map(m => (
                                        <option key={m.id} value={m.id}>{m.initials} - {m.first_name} {m.last_name}</option>
                                    ))}
                                </select>
                                <button
                                    className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white disabled:opacity-50"
                                    disabled={!newMemberId}
                                    onClick={async()=>{
                                        if (!newMemberId) return;
                                        try { await addProjectMember(project.id, newMemberId); setNewMemberId(''); } catch (e:any) { alert(e?.message || 'Failed to add'); }
                                    }}
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                        <ul className="space-y-2">
                            {projectMembers.length === 0 ? (
                                salesRep ? (
                                    <li className="flex items-center justify-between p-2 rounded border dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">{salesRep.initials}</div>
                                            <div>
                                                <div className="text-sm font-medium">{salesRep.first_name} {salesRep.last_name}</div>
                                                {salesRep.jobTitle && <div className="text-xs text-gray-500">{salesRep.jobTitle}</div>}
                                            </div>
                                        </div>
                                    </li>
                                ) : (
                                    <li className="text-sm text-gray-500">No members assigned.</li>
                                )
                            ) : null}
                            {projectMembers.map(m => (
                                <li key={m.id} className="flex items-center justify-between p-2 rounded border dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">{m.initials}</div>
                                        <div>
                                            <div className="text-sm font-medium">{m.first_name} {m.last_name}</div>
                                            {m.jobTitle && <div className="text-xs text-gray-500">{m.jobTitle}</div>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={async()=>{ try { await removeProjectMember(project.id, m.id); } catch (e:any) { alert(e?.message || 'Failed to remove'); } }}
                                        className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                                    >
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Quote Items (read-only) */}
                    <QuoteItems projectId={project.id} />

                     <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-4 flex items-center"><PencilIcon className="w-6 h-6 mr-2 text-gray-500" /> Notes</h2>
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{project.notes}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-4 flex items-center"><DollarIcon className="w-6 h-6 mr-2 text-gray-500" /> Commercial Overview</h2>
                        <div className="space-y-3 text-sm">
                             <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Fuel Type</span>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">{project.fuelType}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Number of Vessels</span>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">{project.numberOfVessels}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Pumps per Vessel</span>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">{project.pumpsPerVessel}</span>
                            </div>
                             {project.vesselSize && project.vesselSizeUnit && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Vessel Size</span>
                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{project.vesselSize.toLocaleString()} {project.vesselSizeUnit}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center gap-2">
                                <span className="text-gray-600 dark:text-gray-400">Quote Price / Vessel</span>
                                {isPriceEstimated ? (
                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{currencySymbol}{project.pricePerVessel.toLocaleString()}</span>
                                ) : (
                                    <span className="font-semibold text-gray-500 dark:text-gray-400 italic">To be estimated</span>
                                )}
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Total Quote (All Vessels)</span>
                                {isPriceEstimated ? (
                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{currencySymbol}{(project.pricePerVessel * project.numberOfVessels).toLocaleString()}</span>
                                ) : (
                                    <span className="font-semibold text-gray-500 dark:text-gray-400 italic">—</span>
                                )}
                            </div>
                            {/* Flow Specification moved to Products & Specifications card */}
                            {grossMarginPct !== undefined && (
                                <div className="flex justify-between pt-2 border-t dark:border-gray-700">
                                    <span className="text-gray-600 dark:text-gray-400 flex items-center"><PercentIcon className="w-4 h-4 mr-1" /> Gross Margin</span>
                                    <span className="font-semibold text-green-600 dark:text-green-400">{grossMarginPct}%</span>
                                </div>
                            )}
                            {grossMarginPct === undefined && showGrossMargin && project.grossMarginPercent !== undefined && (
                                <div className="flex justify-between pt-2 border-t dark:border-gray-700">
                                    <span className="text-gray-600 dark:text-gray-400 flex items-center"><PercentIcon className="w-4 h-4 mr-1" /> Gross Margin</span>
                                    <span className="font-semibold text-green-600 dark:text-green-400">{project.grossMarginPercent}%</span>
                                </div>
                            )}
                            {showHedgeCurrency && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Hedge Currency</span>
                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{project.hedgeCurrency}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    {primaryContact && (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                             <h2 className="text-xl font-semibold mb-4">Primary Contact</h2>
                             <ContactCard contact={primaryContact} company={findCompany(primaryContact.companyId)} />
                        </div>
                    )}
                                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                                                                     <div className="flex items-center justify-between mb-4">
                                                                         <h2 className="text-xl font-semibold">Involved Companies</h2>
                                                                     </div>
                         <div className="space-y-4">
                            {shipyard && <CompanyCard company={shipyard} />}
                            {vesselOwner && <CompanyCard company={vesselOwner} />}
                            {designCompany && <CompanyCard company={designCompany} />}
                         </div>
                    </div>
                </div>
            </div>
    </div>
    {/* ActivitySlideOver is rendered globally in App */}
    </>
    );
};

// Lightweight, inline read-only items viewer
const QuoteItems: React.FC<{ projectId: string }> = ({ projectId }) => {
    const { reloadProjects } = useData(); // available for future refresh triggers
    const [loading, setLoading] = useState<boolean>(false);
    const [items, setItems] = useState<Array<{ id: string; quantity?: number | null; unit?: string | null; notes?: string | null }>>([]);

    useEffect(() => {
        let mounted = true;
    const run = async () => {
            setLoading(true);
            try {
                const apiBase = (window as any).API_URL || `${window.location.origin}`;
        const token = localStorage.getItem('token');
        const res = await fetch(`${apiBase}/api/projects/${projectId}/line-items`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
                if (!res.ok) throw new Error('Failed to load items');
                const data = await res.json();
                if (mounted && Array.isArray(data)) {
                    setItems(data.map((d:any) => ({ id: String(d.id), quantity: d.quantity ?? null, unit: d.unit ?? 'of', notes: d.notes ?? '' })));
                }
            } catch (e) {
                // Silent in UI; section remains minimal
            } finally {
                if (mounted) setLoading(false);
            }
        };
        run();
        return () => { mounted = false; };
    }, [projectId]);

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Quote Items</h2>
            {loading && <p className="text-sm text-gray-500">Loading…</p>}
            {!loading && (!items || items.length === 0) && (
                <p className="text-sm text-gray-500">No items yet. Generate a quote to populate AUTO items.</p>
            )}
            {!loading && items && items.length > 0 && (
                <ul className="space-y-2">
                    {items.map((it, idx) => (
                        <li key={it.id} className="p-2 rounded border dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
                            <div className="text-sm font-medium">{idx + 1}. {it.quantity ?? ''} {it.unit || 'of'}</div>
                            {it.notes && <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">{String(it.notes).replace(/^AUTO:\s*/i, '')}</div>}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};