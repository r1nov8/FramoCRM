import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Company, Contact, Project, Product, TeamMember } from '../types';
import { ProjectStage, ProductType, CompanyType, Currency, VesselSizeUnit, FuelType, ProjectType } from '../types';
import { Modal } from './Modal';
import { PlusIcon, TrashIcon } from './icons';

interface EditProjectModalProps {
    onClose: () => void;
    onUpdateProject: (project: Project) => void;
    project: Project;
    companies: Company[];
    contacts: Contact[];
    teamMembers: TeamMember[];
    onAddCompanyClick: (type: CompanyType) => void;
    onAddContactClick: () => void;
}

const lateStagesForOrderNumber = [ProjectStage.ORDER_CONFIRMATION, ProjectStage.WON, ProjectStage.LOST, ProjectStage.CANCELLED];
const stagesForGrossMargin = [ProjectStage.QUOTE, ProjectStage.PO, ProjectStage.ORDER_CONFIRMATION, ProjectStage.WON];
const stagesForHedgeCurrency = [ProjectStage.ORDER_CONFIRMATION, ProjectStage.WON, ProjectStage.LOST, ProjectStage.CANCELLED];

export const EditProjectModal: React.FC<EditProjectModalProps> = ({ onClose, onUpdateProject, project, companies, contacts, teamMembers, onAddCompanyClick, onAddContactClick }) => {
    const [projectName, setProjectName] = useState('');
    const [opportunityNumber, setOpportunityNumber] = useState('');
    const [orderNumber, setOrderNumber] = useState('');
    const [closingDate, setClosingDate] = useState('');
    const [stage, setStage] = useState<ProjectStage>(ProjectStage.LEAD);
    const [currency, setCurrency] = useState<Currency>(Currency.USD);
    const [hedgeCurrency, setHedgeCurrency] = useState<Currency | ''>('');
    const [grossMarginPercent, setGrossMarginPercent] = useState<number | ''>('');
    const [salesRepId, setSalesRepId] = useState('');
    const [shipyardId, setShipyardId] = useState('');
    const [vesselOwnerId, setVesselOwnerId] = useState('');
    const [designCompanyId, setDesignCompanyId] = useState('');
    const [primaryContactId, setPrimaryContactId] = useState('');
    const [notes, setNotes] = useState('');
    // Flow spec fields
    const [flowDescription, setFlowDescription] = useState('');
    const [flowCapacityM3h, setFlowCapacityM3h] = useState<number | ''>('');
    const [flowMwc, setFlowMwc] = useState<number | ''>('');
    const [flowPowerKw, setFlowPowerKw] = useState<number | ''>('');
    const [products, setProducts] = useState<Product[]>([]);
    const [numberOfVessels, setNumberOfVessels] = useState(1);
    const [pumpsPerVessel, setPumpsPerVessel] = useState(1);
    const [vesselSize, setVesselSize] = useState<number | ''>('');
    const [vesselSizeUnit, setVesselSizeUnit] = useState<VesselSizeUnit>(VesselSizeUnit.DWT);
    const [fuelType, setFuelType] = useState<FuelType>(FuelType.METHANOL);

    useEffect(() => {
        if (project) {
            setProjectName(project.name);
            setOpportunityNumber(project.opportunityNumber);
            setOrderNumber(project.orderNumber || '');
            setClosingDate(project.closingDate);
            setStage(project.stage);
            setCurrency(project.currency);
            setHedgeCurrency(project.hedgeCurrency || '');
            setGrossMarginPercent(project.grossMarginPercent ?? '');
            setSalesRepId(project.salesRepId ? String(project.salesRepId) : '');
            setShipyardId(project.shipyardId);
            setVesselOwnerId(project.vesselOwnerId || '');
            setDesignCompanyId(project.designCompanyId || '');
            setPrimaryContactId(
                project.primaryContactId && contacts.find(c => String(c.id) === String(project.primaryContactId))
                    ? String(project.primaryContactId)
                    : ''
            );
            setNotes(project.notes);
            setProducts(project.products);
            setNumberOfVessels(project.numberOfVessels);
            setPumpsPerVessel(project.pumpsPerVessel);
            setVesselSize(project.vesselSize ?? '');
            setVesselSizeUnit(project.vesselSizeUnit ?? VesselSizeUnit.DWT);
            setFuelType(project.fuelType);
            setFlowDescription(project.flowDescription || '');
            setFlowCapacityM3h(typeof project.flowCapacityM3h === 'number' ? project.flowCapacityM3h : '');
            setFlowMwc(typeof project.flowMwc === 'number' ? project.flowMwc : '');
            setFlowPowerKw(typeof project.flowPowerKw === 'number' ? project.flowPowerKw : '');
        }
    }, [project]);

    const isAH = project?.projectType === ProjectType.ANTI_HEELING;
    const oppLabel = isAH ? 'Project No.' : 'Opportunity No.';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectName || !opportunityNumber || !salesRepId || !shipyardId || !currency) {
            alert(`Please fill in all required fields: Project Name, ${oppLabel}, Sales Rep, Shipyard, and Currency.`);
            return;
        }
        if (lateStagesForOrderNumber.includes(stage) && !orderNumber) {
            alert('Please provide an Order No. for projects in this stage.');
            return;
        }
        if (stagesForHedgeCurrency.includes(stage) && !hedgeCurrency) {
            alert('Please select a Hedge Currency for projects in this stage.');
            return;
        }

        onUpdateProject({
            ...project, // Keep the original ID, price, value
            name: projectName,
            opportunityNumber,
            orderNumber: orderNumber || undefined,
            currency,
            hedgeCurrency: hedgeCurrency || undefined,
            grossMarginPercent: typeof grossMarginPercent === 'number' ? grossMarginPercent : undefined,
            closingDate,
            stage,
            salesRepId,
            shipyardId,
            vesselOwnerId: vesselOwnerId || undefined,
            designCompanyId: designCompanyId || undefined,
            primaryContactId: primaryContactId || undefined,
            products,
            notes,
            numberOfVessels,
            pumpsPerVessel,
            vesselSize: typeof vesselSize === 'number' ? vesselSize : undefined,
            vesselSizeUnit: vesselSizeUnit || undefined,
            fuelType,
            flowDescription: isAH ? undefined : (flowDescription || undefined),
            flowCapacityM3h: isAH ? (flowCapacityM3h === '' ? undefined : Number(flowCapacityM3h)) : undefined,
            flowMwc: isAH ? (flowMwc === '' ? undefined : Number(flowMwc)) : undefined,
            flowPowerKw: isAH ? (flowPowerKw === '' ? undefined : Number(flowPowerKw)) : undefined,
            // Recalculate value in case number of vessels changed
            value: (project.pricePerVessel || 0) * numberOfVessels,
        });
    };

    const handleProductChange = <K extends keyof Product,>(index: number, field: K, fieldValue: Product[K]) => {
        const newProducts = [...products];
        newProducts[index][field] = fieldValue;
        setProducts(newProducts);
    };
    
    const addProduct = () => {
        setProducts([...products, { type: ProductType.SD_100, quantity: 1, capacity: 100, head: 100 }]);
    };

    const removeProduct = (index: number) => {
        setProducts(products.filter((_, i) => i !== index));
    };

    const inputClass = "w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none";
    const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
    const addButtonClass = "p-2 rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 flex-shrink-0";

    // Reusable searchable company select (by name)
    const SearchableCompanySelect: React.FC<{
        id: string;
        label: string;
        value: string;
        onChange: (val: string) => void;
        companies: Company[];
        placeholder?: string;
        required?: boolean;
        onAddCompanyClick?: () => void;
    }> = ({ id, label, value, onChange, companies, placeholder = 'Search company by name…', required, onAddCompanyClick }) => {
        const [open, setOpen] = useState(false);
        const [query, setQuery] = useState('');
        const containerRef = useRef<HTMLDivElement | null>(null);
        const inputRef = useRef<HTMLInputElement | null>(null);

        const selected = useMemo(() => companies.find(c => String(c.id) === String(value)) || null, [companies, value]);
        const q = query.trim().toLowerCase();
        const results = useMemo(() => {
            if (!q) return companies.slice(0, 50);
            return companies.filter(c => String(c.name || '').toLowerCase().includes(q)).slice(0, 50);
        }, [companies, q]);

        useEffect(() => {
            const onDocClick = (e: MouseEvent) => {
                if (!containerRef.current) return;
                if (!containerRef.current.contains(e.target as Node)) {
                    setOpen(false);
                }
            };
            document.addEventListener('mousedown', onDocClick);
            return () => document.removeEventListener('mousedown', onDocClick);
        }, []);

        const commitSelection = (idVal: string, name?: string) => {
            onChange(idVal);
            setQuery(name || '');
            setOpen(false);
        };

        return (
            <div className="w-full" ref={containerRef}>
                <label htmlFor={id} className={labelClass}>{label}{required ? ' *' : ''}</label>
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <input
                            id={id}
                            ref={inputRef}
                            type="text"
                            value={open ? query : (selected?.name ?? query)}
                            onChange={e => { setQuery(e.target.value); setOpen(true); }}
                            onFocus={() => { setOpen(true); setQuery(selected?.name || ''); }}
                            placeholder={placeholder}
                            className={inputClass}
                            aria-autocomplete="list"
                            aria-expanded={open}
                            autoComplete="off"
                            required={required && !value}
                        />
                        {value && (
                            <button
                                type="button"
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
                                aria-label="Clear selection"
                                onClick={() => { onChange(''); setQuery(''); inputRef.current?.focus(); }}
                            >
                                ×
                            </button>
                        )}
                        {open && (
                            <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg">
                                {results.length === 0 && (
                                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-300">No matches</div>
                                )}
                                {results.map(c => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-gray-700 ${String(c.id) === String(value) ? 'bg-blue-50 dark:bg-gray-700' : ''}`}
                                        onClick={() => commitSelection(String(c.id), c.name)}
                                    >
                                        <div className="font-medium text-gray-900 dark:text-gray-100">{c.name}</div>
                                        {c.location && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{c.location}</div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {onAddCompanyClick && (
                        <button type="button" onClick={onAddCompanyClick} className={addButtonClass} aria-label={`Add new ${label.toLowerCase()}`}>
                            <PlusIcon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Edit Project">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="projectName" className={labelClass}>Project Name</label>
                        <input type="text" id="projectName" value={projectName} onChange={e => setProjectName(e.target.value)} className={inputClass} required />
                    </div>
                    <div>
                        <label htmlFor="opportunityNumber" className={labelClass}>{oppLabel}</label>
                        <input type="text" id="opportunityNumber" value={opportunityNumber} onChange={e => setOpportunityNumber(e.target.value)} className={inputClass} required />
                    </div>
                </div>

                 <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Commercial Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="numberOfVessels" className={labelClass}>No. of Vessels</label>
                            <input type="number" id="numberOfVessels" min="1" value={numberOfVessels} onChange={e => setNumberOfVessels(Number(e.target.value))} className={inputClass} />
                        </div>
                        <div>
                            <label htmlFor="pumpsPerVessel" className={labelClass}>Pumps per Vessel</label>
                            <input type="number" id="pumpsPerVessel" min="1" value={pumpsPerVessel} onChange={e => setPumpsPerVessel(Number(e.target.value))} className={inputClass} />
                        </div>
                        <div>
                            <label htmlFor="fuelType" className={labelClass}>Fuel Type</label>
                             <select id="fuelType" value={fuelType} onChange={e => setFuelType(e.target.value as FuelType)} className={inputClass}>
                                {Object.values(FuelType).map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                         <div>
                            <label htmlFor="vesselSize" className={labelClass}>Vessel Size</label>
                            <div className="flex space-x-2">
                                <input type="number" id="vesselSize" min="0" value={vesselSize} onChange={e => setVesselSize(e.target.value === '' ? '' : Number(e.target.value))} className={inputClass} />
                                <select value={vesselSizeUnit} onChange={e => setVesselSizeUnit(e.target.value as VesselSizeUnit)} className={inputClass}>
                                    {Object.values(VesselSizeUnit).map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>
                        </div>
                         <div>
                            <label htmlFor="currency" className={labelClass}>Currency</label>
                            <select id="currency" value={currency} onChange={e => setCurrency(e.target.value as Currency)} className={inputClass}>
                                {Object.values(Currency).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="mt-3 text-right">
                        <span className={labelClass}>Total Project Value</span>
                         {project.pricePerVessel ? (
                            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{(numberOfVessels * project.pricePerVessel).toLocaleString()} {currency}</p>
                         ) : (
                            <p className="text-lg font-bold text-gray-500 dark:text-gray-400 italic">To be estimated</p>
                         )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label htmlFor="stage" className={labelClass}>Stage</label>
                        <select id="stage" value={stage} onChange={e => setStage(e.target.value as ProjectStage)} className={inputClass}>
                            {Object.values(ProjectStage).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="closingDate" className={labelClass}>Closing Date</label>
                        <input type="date" id="closingDate" value={closingDate} onChange={e => setClosingDate(e.target.value)} className={inputClass} />
                    </div>
                </div>
                {/* Flow Specification */}
                {isAH ? (
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Flow Specification</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className={labelClass}>Capacity (m3/h)</label>
                                <input type="number" min="0" value={flowCapacityM3h} onChange={e => setFlowCapacityM3h(e.target.value === '' ? '' : Number(e.target.value))} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>MWC</label>
                                <input type="number" min="0" value={flowMwc} onChange={e => setFlowMwc(e.target.value === '' ? '' : Number(e.target.value))} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Power (kW)</label>
                                <input type="number" min="0" value={flowPowerKw} onChange={e => setFlowPowerKw(e.target.value === '' ? '' : Number(e.target.value))} className={inputClass} />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div>
                        <label htmlFor="flowDescription" className={labelClass}>Flow Specification (optional)</label>
                        <input id="flowDescription" type="text" value={flowDescription} onChange={e => setFlowDescription(e.target.value)} placeholder="e.g., 600 m3/h @ 15 mwc @ 48 kW" className={inputClass} />
                    </div>
                )}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {stagesForGrossMargin.includes(stage) && (
                        <div>
                            <label htmlFor="grossMargin" className={labelClass}>Gross Margin (%)</label>
                            <input type="number" id="grossMargin" min="0" step="0.1" value={grossMarginPercent} onChange={e => setGrossMarginPercent(e.target.value === '' ? '' : Number(e.target.value))} className={inputClass} />
                        </div>
                    )}
                    {lateStagesForOrderNumber.includes(stage) && (
                        <div>
                            <label htmlFor="orderNumber" className={labelClass}>Order No.</label>
                            <input type="text" id="orderNumber" value={orderNumber} onChange={e => setOrderNumber(e.target.value)} className={inputClass} required />
                        </div>
                    )}
                    {stagesForHedgeCurrency.includes(stage) && (
                        <div>
                            <label htmlFor="hedgeCurrency" className={labelClass}>Hedge Currency</label>
                            <select id="hedgeCurrency" value={hedgeCurrency} onChange={e => setHedgeCurrency(e.target.value as Currency)} className={inputClass} required>
                                <option value="">Select Hedge Currency</option>
                                {Object.values(Currency).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                <div>
                    <label htmlFor="salesRep" className={labelClass}>Sales Representative</label>
                    <select id="salesRep" value={salesRepId} onChange={e => setSalesRepId(e.target.value)} className={inputClass} required>
                        <option value="">Select Sales Rep</option>
                        {teamMembers.map(tm => {
                            const fullName = [tm.first_name, tm.last_name].filter(Boolean).join(' ').trim() || tm.initials || String(tm.id);
                            return <option key={tm.id} value={String(tm.id)}>{fullName}</option>;
                        })}
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SearchableCompanySelect
                        id="shipyard"
                        label="Shipyard"
                        value={String(shipyardId || '')}
                        onChange={setShipyardId}
                        companies={companies}
                        required
                        onAddCompanyClick={() => onAddCompanyClick(CompanyType.SHIPYARD)}
                    />
                    <div>
                        <label htmlFor="primaryContact" className={labelClass}>Primary Contact (Optional)</label>
                        <div className="flex items-center space-x-2">
                            <select id="primaryContact" value={primaryContactId} onChange={e => setPrimaryContactId(e.target.value)} className={inputClass}>
                                <option value="">Select Contact</option>
                                {(Array.isArray(contacts) ? contacts : []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                             <button type="button" onClick={onAddContactClick} className={addButtonClass} aria-label="Add new contact">
                                <PlusIcon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SearchableCompanySelect
                        id="vesselOwner"
                        label="Vessel Owner (Optional)"
                        value={String(vesselOwnerId || '')}
                        onChange={setVesselOwnerId}
                        companies={companies}
                        onAddCompanyClick={() => onAddCompanyClick(CompanyType.VESSEL_OWNER)}
                    />
                    <SearchableCompanySelect
                        id="designCompany"
                        label="Design Company (Optional)"
                        value={String(designCompanyId || '')}
                        onChange={setDesignCompanyId}
                        companies={companies}
                        onAddCompanyClick={() => onAddCompanyClick(CompanyType.DESIGN_COMPANY)}
                    />
                </div>

                <div>
                    <h3 className={labelClass + " mt-4 mb-2"}>Products</h3>
                    <div className="space-y-4">
                        {products.map((p, i) => (
                            <div key={i} className="p-3 border rounded-md dark:border-gray-600 space-y-2 relative">
                                {products.length > 1 && (
                                     <button type="button" onClick={() => removeProduct(i)} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500" aria-label="Remove product">
                                         <TrashIcon className="w-4 h-4" />
                                     </button>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                     <div>
                                        <label className="text-xs text-gray-500">Product Type</label>
                                        <select value={p.type} onChange={e => handleProductChange(i, 'type', e.target.value as ProductType)} className={inputClass}>
                                            {Object.values(ProductType).map(pt => <option key={pt} value={pt}>{pt}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">Quantity</label>
                                        <input type="number" min="1" value={p.quantity} onChange={e => handleProductChange(i, 'quantity', Number(e.target.value))} className={inputClass} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-gray-500">Capacity (m³/h)</label>
                                        <input type="number" min="0" value={p.capacity} onChange={e => handleProductChange(i, 'capacity', Number(e.target.value))} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">Head (mlc)</label>
                                        <input type="number" min="0" value={p.head} onChange={e => handleProductChange(i, 'head', Number(e.target.value))} className={inputClass} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                     <button type="button" onClick={addProduct} className="mt-2 flex items-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                        <PlusIcon className="w-4 h-4 mr-1" /> Add Product
                    </button>
                </div>

                <div>
                    <label htmlFor="notes" className={labelClass}>Notes</label>
                    <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={4} className={inputClass}></textarea>
                </div>

                <div className="flex justify-end pt-4">
                    <button type="button" onClick={onClose} className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cancel</button>
                    <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Save Changes</button>
                </div>
            </form>
        </Modal>
    );
};