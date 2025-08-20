import React, { useState, useMemo } from 'react';
// Vessel type options
const VESSEL_TYPES = [
    'Container',
    'Bulk',
    'PCTC',
    'RoRo',
    'RoPax',
];
import type { Company, Contact, Project, Product, TeamMember } from '../types';
import { ProjectStage, ProductType, CompanyType, Currency, VesselSizeUnit, FuelType } from '../types';
import { Modal } from './Modal';
import { PlusIcon, TrashIcon } from './icons';

interface AddProjectModalProps {
    onClose: () => void;
    onAddProject: (project: Omit<Project, 'id'>) => void;
    companies: Company[];
    contacts: Contact[];
    teamMembers: TeamMember[];
    projects: Project[];
    onAddCompanyClick: (type: CompanyType) => void;
    onAddContactClick: () => void;
}

const lateStagesForOrderNumber = [ProjectStage.ORDER_CONFIRMATION, ProjectStage.WON, ProjectStage.LOST, ProjectStage.CANCELLED];
const stagesForGrossMargin = [ProjectStage.QUOTE, ProjectStage.PO, ProjectStage.ORDER_CONFIRMATION, ProjectStage.WON];
const stagesForHedgeCurrency = [ProjectStage.ORDER_CONFIRMATION, ProjectStage.WON, ProjectStage.LOST, ProjectStage.CANCELLED];

export const AddProjectModal: React.FC<AddProjectModalProps> = ({ onClose, onAddProject, companies, contacts, teamMembers, projects, onAddCompanyClick, onAddContactClick }) => {
    // Defensive: ensure arrays are always defined
    companies = companies || [];
    contacts = contacts || [];
    teamMembers = teamMembers || [];

    const [vesselType, setVesselType] = useState('');
    const [projectName, setProjectName] = useState('');
    // Find the highest OPP number and suggest the next one
    const highestOpp = useMemo(() => {
        const oppNumbers = companies
            .concat(contacts as any) // Defensive, but not needed, just to keep the code safe
            .length; // Dummy, ignore
        return projects
            ? projects
                .map((p: any) => {
                    const match = /OPP-(\d+)/.exec(p.opportunityNumber);
                    return match ? parseInt(match[1], 10) : null;
                })
                .filter((n: number | null) => n !== null)
                .reduce((max: number, n: number) => Math.max(max, n), 0)
            : 0;
    }, [projects]);
    const [opportunityNumber, setOpportunityNumber] = useState(() => `OPP-${highestOpp + 1}`);
    const [orderNumber, setOrderNumber] = useState('');
    const [closingDate, setClosingDate] = useState(new Date().toISOString().split('T')[0]);
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
    const [products, setProducts] = useState<Product[]>([{ type: ProductType.SD_100, quantity: 1, capacity: 100, head: 100 }]);
    const [numberOfVessels, setNumberOfVessels] = useState(1);
    const [pumpsPerVessel, setPumpsPerVessel] = useState(1);
    const [vesselSize, setVesselSize] = useState<number | ''>('');
    const [vesselSizeUnit, setVesselSizeUnit] = useState<VesselSizeUnit>(VesselSizeUnit.DWT);
    const [fuelType, setFuelType] = useState<FuelType>(FuelType.METHANOL);

    const [oppError, setOppError] = useState<string | null>(null);
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!projectName || !opportunityNumber || !salesRepId || !shipyardId || !primaryContactId || !currency) {
                alert('Please fill in all required fields: Project Name, Opportunity No., Sales Rep, Shipyard, Primary Contact, and Currency.');
                return;
            }
            // Check for duplicate OPP number
            const duplicate = projects.some((p: any) => p.opportunityNumber === opportunityNumber);
            if (duplicate) {
                setOppError('Opp. No in use');
                return;
            } else {
                setOppError(null);
            }
            if (lateStagesForOrderNumber.includes(stage) && !orderNumber) {
                alert('Please provide an Order No. for projects in this stage.');
                return;
            }
            if (stagesForHedgeCurrency.includes(stage) && !hedgeCurrency) {
                alert('Please select a Hedge Currency for projects in this stage.');
                return;
            }
            const projectData = {
                name: projectName,
                opportunityNumber,
                orderNumber: orderNumber || undefined,
                value: 0, // Initial value is 0, will be updated by calculator
                currency,
                hedgeCurrency: hedgeCurrency || undefined,
                grossMarginPercent: typeof grossMarginPercent === 'number' ? grossMarginPercent : undefined,
                closingDate,
                stage,
                salesRepId,
                shipyardId,
                vesselOwnerId: vesselOwnerId || undefined,
                designCompanyId: designCompanyId || undefined,
                primaryContactId,
                products,
                notes,
                numberOfVessels,
                pumpsPerVessel,
                pricePerVessel: undefined, // Price is set via calculator
                vesselSize: typeof vesselSize === 'number' ? vesselSize : undefined,
                vesselSizeUnit: vesselSizeUnit || undefined,
                fuelType,
                files: [],
            };
            console.log('[AddProjectModal] Submitting project:', projectData);
            onAddProject(projectData);
        } catch (err) {
            console.error('[AddProjectModal] Error in handleSubmit:', err);
            alert('An error occurred while submitting the project. Check the console for details.');
        }
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

    const inputClass = "w-full px-2 py-1.5 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm";
    const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
    const addButtonClass = "p-2 rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 flex-shrink-0";

    return (
        <Modal isOpen={true} onClose={onClose} title="Add New Project">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="projectName" className={labelClass}>Project Name</label>
                        <input type="text" id="projectName" value={projectName} onChange={e => setProjectName(e.target.value)} className={inputClass} required />
                    </div>
                    <div>
                        <label htmlFor="opportunityNumber" className={labelClass}>Opportunity No.</label>
                        <input type="text" id="opportunityNumber" value={opportunityNumber} onChange={e => setOpportunityNumber(e.target.value)} className={inputClass + (oppError ? ' border-red-500' : '')} required />
                        {oppError && <p className="text-red-500 text-xs mt-1">{oppError}</p>}
                    </div>
                </div>

                 <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Commercial Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="flex flex-col justify-end">
                            <label htmlFor="numberOfVessels" className={labelClass}>No. of Vessels</label>
                            <input type="number" id="numberOfVessels" min="1" value={numberOfVessels} onChange={e => setNumberOfVessels(Number(e.target.value))} className={inputClass} />
                        </div>
                        <div className="flex flex-col justify-end">
                            <label htmlFor="pumpsPerVessel" className={labelClass}>Pumps per Vessel</label>
                            <input type="number" id="pumpsPerVessel" min="1" value={pumpsPerVessel} onChange={e => setPumpsPerVessel(Number(e.target.value))} className={inputClass} />
                        </div>
                        <div className="flex flex-col justify-end">
                            <label htmlFor="fuelType" className={labelClass}>Fuel Type</label>
                            <select id="fuelType" value={fuelType} onChange={e => setFuelType(e.target.value as FuelType)} className={inputClass}>
                                {Object.values(FuelType).map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col justify-end">
                            <label htmlFor="vesselType" className={labelClass}>Vessel Type</label>
                            <select id="vesselType" value={vesselType} onChange={e => setVesselType(e.target.value)} className={inputClass} required>
                                <option value="">Select Vessel Type</option>
                                {VESSEL_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                            </select>
                        </div>
                        {/* Vessel Size and Currency in same row for perfect alignment */}
                        <div className="md:col-span-2 flex flex-row gap-6">
                            <div className="flex flex-col flex-1 justify-end">
                                <label htmlFor="vesselSize" className={labelClass}>Vessel Size</label>
                                <div className="flex items-center gap-2">
                                    <input type="number" id="vesselSize" min="0" value={vesselSize} onChange={e => setVesselSize(e.target.value === '' ? '' : Number(e.target.value))} className={inputClass + ' flex-1'} />
                                    <span className="inline-flex items-center px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm h-9 ml-0">
                                        {vesselType === 'RoRo' || vesselType === 'RoPax' ? 'LM' : vesselType === 'PCTC' ? 'CEU' : 'DWT'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-col flex-1 justify-end">
                                <label htmlFor="currency" className={labelClass}>Default Currency</label>
                                <select id="currency" value={currency} onChange={e => setCurrency(e.target.value as Currency)} className={inputClass}>
                                    {Object.values(Currency).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end items-center mt-2 min-h-[48px]">
                        <span className="text-gray-500 dark:text-gray-300 italic text-lg font-semibold text-right">Total Project Value<br /><span className="text-base font-normal">To be estimated</span></span>
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
                        {teamMembers.map(tm => (
                            <option key={tm.id} value={tm.id}>{tm.first_name} {tm.last_name}</option>
                        ))}
                    </select>
                </div>


                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="shipyard" className={labelClass}>Shipyard</label>
                        <div className="flex items-center space-x-2">
                            <select id="shipyard" value={shipyardId} onChange={e => setShipyardId(e.target.value)} className={inputClass} required>
                                <option value="">Select Shipyard</option>
                                {companies.filter(c => c.type === CompanyType.SHIPYARD).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <button type="button" onClick={() => onAddCompanyClick(CompanyType.SHIPYARD)} className={addButtonClass} aria-label="Add new shipyard">
                                <PlusIcon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                            </button>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="primaryContact" className={labelClass}>Primary Contact</label>
                        <div className="flex items-center space-x-2">
                            <select id="primaryContact" value={primaryContactId} onChange={e => setPrimaryContactId(e.target.value)} className={inputClass} required>
                                <option value="">Select Contact</option>
                                {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                             <button type="button" onClick={onAddContactClick} className={addButtonClass} aria-label="Add new contact">
                                <PlusIcon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="vesselOwner" className={labelClass}>Vessel Owner (Optional)</label>
                        <div className="flex items-center space-x-2">
                            <select id="vesselOwner" value={vesselOwnerId} onChange={e => setVesselOwnerId(e.target.value)} className={inputClass}>
                                <option value="">Select Vessel Owner</option>
                                {companies.filter(c => c.type === CompanyType.VESSEL_OWNER).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <button type="button" onClick={() => onAddCompanyClick(CompanyType.VESSEL_OWNER)} className={addButtonClass} aria-label="Add new vessel owner">
                                <PlusIcon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                            </button>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="designCompany" className={labelClass}>Design Company (Optional)</label>
                        <div className="flex items-center space-x-2">
                            <select id="designCompany" value={designCompanyId} onChange={e => setDesignCompanyId(e.target.value)} className={inputClass}>
                                <option value="">Select Design Company</option>
                                {companies.filter(c => c.type === CompanyType.DESIGN_COMPANY).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <button type="button" onClick={() => onAddCompanyClick(CompanyType.DESIGN_COMPANY)} className={addButtonClass} aria-label="Add new design company">
                                <PlusIcon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                            </button>
                        </div>
                    </div>
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
                    <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Add Project</button>
                </div>
            </form>
        </Modal>
    );
};