import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from './Modal';
import type { Project, Company, TeamMember } from '../types';
import { Currency } from '../types';
import { PRICING_DATA } from '../data/pricingData';
import type { PriceEntry, Accessory, PumpPriceData, PumpVariant } from '../data/pricingData';

interface LineItem {
    id: string;
    description: string;
    sub?: string;
    isPump?: boolean;
    isTrunk?: boolean;
    isAccessory?: boolean;
    pumpType?: string;
    pumpVariant?: PumpVariant;
    pumpLength?: number;
    selectedOption?: string; // name of selected trunk/accessory
    qty: number;
    unitPrice: number;
}

interface EstimateCalculatorModalProps {
    onClose: () => void;
    project: Project;
    companies: Company[];
    teamMembers: TeamMember[];
    onUpdateProjectPrice: (price: number, currency: Currency) => void;
}

const pumpVariantDescriptions: { [key: string]: string } = {
    CS: "CS** = Cofferdam + Strip",
    CST: "CST* = Cofferdam + Strip + Temp sensor",
    CSTV: "CSTV = Cofferdam + Strip + Temp sensor + Vacuumdrain"
};

const getInitialLineItems = (): LineItem[] => {
    const initialPumpType: keyof typeof PRICING_DATA.cargoPumps = 'SD100';
    const initialPumpVariant: PumpVariant = 'CST';
    const initialPumpLength = 18;
    const initialQty = 2;

    const pumpData = (PRICING_DATA.cargoPumps as Record<string, PumpPriceData>)[initialPumpType];
    const priceEntry = pumpData.prices.find(p => p.length === initialPumpLength);
    const initialUnitPrice = priceEntry && Object.prototype.hasOwnProperty.call(priceEntry, initialPumpVariant) ? (priceEntry[initialPumpVariant] ?? 0) : 0;

    return [
        { id: '1', description: 'Pump Type', isPump: true, pumpType: initialPumpType, pumpVariant: initialPumpVariant, pumpLength: initialPumpLength, qty: initialQty, unitPrice: initialUnitPrice },
        { id: '2', description: 'Trunk', isTrunk: true, selectedOption: 'None', qty: initialQty, unitPrice: 0 },
        { id: '3', description: 'Optional Accessories', sub: 'Well Suction', isAccessory: true, selectedOption: 'None', qty: initialQty, unitPrice: 0 },
        { id: '4', description: 'Additional Equipment', sub: 'Dummies SD100', qty: 0.2, unitPrice: 11000 },
        { id: '5', description: '', sub: 'Surcharge for extra split pipe per pump (S2000 per pump; NOK 11*1.04*1,4/8,0)', qty: 1, unitPrice: 11000 },
        { id: '6', description: 'Portable Equipment', qty: 0, unitPrice: 0 },
        { id: '7', description: 'Ballast pumps', qty: 0, unitPrice: 0 },
        { id: '8', description: 'Tank cleaning pump', qty: 0, unitPrice: 0 },
        { id: '9', description: 'Bow thruster motor', qty: 0, unitPrice: 0 },
        { id: '10', description: 'Hydraulic module', sub: '2 x A10FZO28 / 2x25kW', qty: 1, unitPrice: 380000 },
        { id: '11', description: 'Misc. Parts', qty: 1, unitPrice: 30000 },
        { id: '12', description: 'Control panel pumps', sub: '2 pumps', qty: 1, unitPrice: 0 },
        { id: '13', description: 'Control panel hydr. syst.', sub: '2 aggregate', qty: 1, unitPrice: 34000 },
        { id: '14', description: 'Heat Exchangers', qty: 0, unitPrice: 0 },
        { id: '15', description: 'Hydraulic piping', sub: 'Type: Type, Mal: Mal', qty: 1, unitPrice: 199200 },
        { id: '16', description: 'Additional Equipment', sub: 'Suction well 18mm', qty: 1, unitPrice: 19000 },
        { id: '17', description: '', sub: 'Jockey pump', qty: 1, unitPrice: 20000 },
        { id: '18', description: 'El.starters, main', sub: '2xVFD (note also 3x VFD starter cabinets)', qty: 2, unitPrice: 10000 },
    ];
};


export const EstimateCalculatorModal: React.FC<EstimateCalculatorModalProps> = ({ onClose, project, companies, teamMembers, onUpdateProjectPrice }) => {
    
    const [lineItems, setLineItems] = useState<LineItem[]>(getInitialLineItems());
    const [usdRate, setUsdRate] = useState(8.70);
    const [eurRate, setEurRate] = useState(11.70);
    const [surchargePercent, setSurchargePercent] = useState(15);
    const [provisionPercent, setProvisionPercent] = useState(4.0);
    const [profitMarginPercent, setProfitMarginPercent] = useState(50.0);

    const shipyard = useMemo(() => companies.find(c => c.id === project.shipyardId), [companies, project.shipyardId]);
    const vesselOwner = useMemo(() => project.vesselOwnerId ? companies.find(c => c.id === project.vesselOwnerId) : undefined, [companies, project.vesselOwnerId]);
    const salesRep = useMemo(() => project.salesRepId ? teamMembers.find(m => m.id === project.salesRepId) : undefined, [teamMembers, project.salesRepId]);
    
    const handleItemChange = (id: string, field: 'qty' | 'unitPrice', value: number) => {
        setLineItems(prev => {
            const updatedItems = prev.map(item => item.id === id ? { ...item, [field]: value } : item);
            
            const changedItem = updatedItems.find(item => item.id === id);
            if (changedItem?.isPump && field === 'qty') {
                return updatedItems.map(item => {
                    if (item.isTrunk || item.isAccessory) {
                        return { ...item, qty: value };
                    }
                    return item;
                });
            }
            return updatedItems;
        });
    };

    const handlePumpSelectionChange = (field: 'pumpType' | 'pumpVariant' | 'pumpLength', value: string | number) => {
        setLineItems(prevItems => {
            const newItems = [...prevItems];
            const pumpItemIndex = newItems.findIndex(item => item.isPump);
            if (pumpItemIndex === -1) return newItems;

            const pumpItem = { ...newItems[pumpItemIndex] };

            if (field === 'pumpType' && typeof value === 'string') {
                const newPumpType = value;
                if (pumpItem.pumpType !== newPumpType) {
                    pumpItem.pumpType = newPumpType;
                    const newPumpData = (PRICING_DATA.cargoPumps as Record<string, PumpPriceData>)[pumpItem.pumpType as keyof typeof PRICING_DATA.cargoPumps];
                    if (newPumpData && newPumpData.prices.length > 0) {
                        const defaultLength = newPumpData.prices[0].length;
                        pumpItem.pumpLength = defaultLength;
                        const defaultPriceEntry = newPumpData.prices[0];
                        const availableVariants = Object.keys(defaultPriceEntry).filter(k => k !== 'length') as PumpVariant[];
                        if (!pumpItem.pumpVariant || !availableVariants.includes(pumpItem.pumpVariant)) {
                             pumpItem.pumpVariant = availableVariants.length > 0 ? availableVariants[0] : undefined;
                        }
                    }
                     // Reset dependent items
                    const trunkItemIndex = newItems.findIndex(item => item.isTrunk);
                    if (trunkItemIndex > -1) {
                        newItems[trunkItemIndex] = { ...newItems[trunkItemIndex], selectedOption: 'None', unitPrice: 0 };
                    }
                    const accessoryItemIndex = newItems.findIndex(item => item.isAccessory);
                    if (accessoryItemIndex > -1) {
                        newItems[accessoryItemIndex] = { ...newItems[accessoryItemIndex], selectedOption: 'None', unitPrice: 0 };
                    }
                }
            } else if (field === 'pumpVariant' && typeof value === 'string') {
                pumpItem.pumpVariant = value as PumpVariant;
            } else if (field === 'pumpLength' && typeof value === 'number') {
                pumpItem.pumpLength = value;
            }

            // Recalculate price
            if (pumpItem.pumpType) {
                const pumpData = (PRICING_DATA.cargoPumps as Record<string, PumpPriceData>)[pumpItem.pumpType as keyof typeof PRICING_DATA.cargoPumps];
                if (pumpData) {
                    const priceEntry = pumpData.prices.find(p => p.length === pumpItem.pumpLength);
                    const variantKey = pumpItem.pumpVariant;
                    if (priceEntry && variantKey && Object.prototype.hasOwnProperty.call(priceEntry, variantKey)) {
                        const price = priceEntry[variantKey];
                        pumpItem.unitPrice = typeof price === 'number' ? price : 0;
                    } else {
                        pumpItem.unitPrice = 0;
                    }
                }
            }
            
            newItems[pumpItemIndex] = pumpItem;
            return newItems;
        });
    };

    const handleOptionChange = (id: string, selectedName: string) => {
        setLineItems(prev => {
            const newItems = [...prev];
            const itemIndex = newItems.findIndex(i => i.id === id);
            if (itemIndex === -1) return prev;
            
            const item = { ...newItems[itemIndex] };
            const pumpItem = newItems.find(i => i.isPump);
            if (!pumpItem || !pumpItem.pumpType) return prev;

            const pumpData = (PRICING_DATA.cargoPumps as Record<string, PumpPriceData>)[pumpItem.pumpType as keyof typeof PRICING_DATA.cargoPumps];
            let options: Accessory[] | undefined = [];
            if(item.isTrunk) options = pumpData.trunk;
            if(item.isAccessory) options = pumpData.optionalAccessories;

            const selected = options?.find(opt => opt.name === selectedName);
            
            item.selectedOption = selectedName;
            item.unitPrice = selected ? selected.price : 0;
            
            newItems[itemIndex] = item;
            return newItems;
        });
    };


    const equipmentCost = useMemo(() => {
        return lineItems.reduce((acc, item) => acc + (item.qty * (item.unitPrice || 0)), 0);
    }, [lineItems]);
    
    const surchargeAmount = useMemo(() => {
        return equipmentCost * (surchargePercent / 100);
    }, [equipmentCost, surchargePercent]);

    const serviceCost = 244000;
    const shippingCost = 120000;
    const escalationCost = 0;

    const totalCostBeforeProvision = useMemo(() => {
        return equipmentCost + surchargeAmount + serviceCost + shippingCost + escalationCost;
    }, [equipmentCost, surchargeAmount]);
    
    const provisionAmount = useMemo(() => {
        return totalCostBeforeProvision * (provisionPercent / 100);
    }, [totalCostBeforeProvision, provisionPercent]);

    const totalSelfCost = useMemo(() => {
        return totalCostBeforeProvision + provisionAmount;
    }, [totalCostBeforeProvision, provisionAmount]);

    const profitAmount = useMemo(() => {
         return totalSelfCost * (profitMarginPercent / 100);
    }, [totalSelfCost, profitMarginPercent]);

    const salesPriceNOK = useMemo(() => {
        return totalSelfCost + profitAmount;
    }, [totalSelfCost, profitAmount]);

    const salesPriceUSD = useMemo(() => {
        return salesPriceNOK / usdRate;
    }, [salesPriceNOK, usdRate]);
    
    const salesPriceEUR = useMemo(() => {
        return salesPriceNOK / eurRate;
    }, [salesPriceNOK, eurRate]);
    
    const pumpItem = lineItems.find(item => item.isPump);
    const trunkItem = lineItems.find(item => item.isTrunk);
    const accessoryItem = lineItems.find(item => item.isAccessory);

    return (
        <Modal isOpen={true} onClose={onClose} title="Estimate Calculator" size="7xl">
            <div className="text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-x-4 gap-y-2 mb-4 border-b pb-4 dark:border-gray-700">
                    <div className="md:col-span-4"><span className="font-semibold">Project:</span> {project.name}</div>
                    <div><span className="font-semibold">Customer (Shipyard):</span> {shipyard?.name || 'N/A'}</div>
                    <div><span className="font-semibold">Vessel Owner:</span> {vesselOwner?.name || 'N/A'}</div>
                    <div><span className="font-semibold">Date:</span> {new Date().toLocaleDateString()}</div>
                    <div><span className="font-semibold">Opportunity:</span> {project.opportunityNumber}</div>
                    <div><span className="font-semibold">Prepared by:</span> {salesRep?.initials || 'N/A'}</div>
                    <div><span className="font-semibold">Vessel Size:</span> {project.vesselSize?.toLocaleString() || 'N/A'} {project.vesselSizeUnit}</div>
                    <div><span className="font-semibold">Fuel Type:</span> {project.fuelType}</div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead className="bg-gray-200 dark:bg-gray-800">
                            <tr>
                                <th className="p-2 text-left font-semibold w-[25%]">Description</th>
                                <th className="p-2 text-left font-semibold w-[35%]">Details</th>
                                <th className="p-2 text-right font-semibold w-[10%]">Qty</th>
                                <th className="p-2 text-right font-semibold w-[15%]">Unit Price</th>
                                <th className="p-2 text-right font-semibold w-[15%]">Total Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lineItems.map(item => {
                                if (item.isPump && item.pumpType && pumpItem) {
                                    const pumpData = (PRICING_DATA.cargoPumps as Record<string, PumpPriceData>)[pumpItem.pumpType];
                                    const availableLengths = pumpData ? pumpData.prices.map(p => p.length) : [];
                                    const availableVariants = pumpData && pumpData.prices.length > 0 ? Object.keys(pumpData.prices[0]).filter(k => k !== 'length') : [];

                                    const trunkOptions = pumpData?.trunk;
                                    const accessoryOptions = pumpData?.optionalAccessories;
                                    const totalAccessoryUnitPrice = (trunkItem?.unitPrice || 0) + (accessoryItem?.unitPrice || 0);
                                    const totalAccessoryPrice = (trunkItem?.qty || 0) * totalAccessoryUnitPrice;

                                    return (
                                        <React.Fragment key={item.id}>
                                            <tr className="border-b dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800/50 align-bottom">
                                                <td className="p-2">
                                                    <div className="font-semibold">{item.description}</div>
                                                    {pumpItem?.pumpVariant && pumpVariantDescriptions[pumpItem.pumpVariant] && (
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 font-normal mt-1">
                                                            {pumpVariantDescriptions[pumpItem.pumpVariant]}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-2">
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <div>
                                                            <label className="text-xs text-gray-500 dark:text-gray-400">Pump Type</label>
                                                            <select value={item.pumpType} onChange={e => handlePumpSelectionChange('pumpType', e.target.value)} className="w-full p-1 bg-transparent border rounded-md dark:border-gray-600">
                                                                {Object.keys(PRICING_DATA.cargoPumps).map(pumpType => (
                                                                    <option key={pumpType} value={pumpType}>{pumpType}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-gray-500 dark:text-gray-400">Variant</label>
                                                            <select value={item.pumpVariant || ''} onChange={e => handlePumpSelectionChange('pumpVariant', e.target.value)} className="w-full p-1 bg-transparent border rounded-md dark:border-gray-600">
                                                                {availableVariants.map(variant => (
                                                                    <option key={variant} value={variant} title={pumpVariantDescriptions[variant]}>{variant}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-gray-500 dark:text-gray-400">Length</label>
                                                            <select value={item.pumpLength?.toString() || ''} onChange={e => handlePumpSelectionChange('pumpLength', Number(e.target.value))} className="w-full p-1 bg-transparent border rounded-md dark:border-gray-600">
                                                                {availableLengths.map(length => (
                                                                    <option key={length} value={length}>{length} m</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-2 text-right">
                                                    <input type="number" value={item.qty} onChange={e => handleItemChange(item.id, 'qty', parseFloat(e.target.value))} className="w-20 p-1 text-right bg-transparent border rounded-md dark:border-gray-600" />
                                                </td>
                                                <td className="p-2 text-right font-medium">
                                                    {(item.unitPrice || 0).toLocaleString('en-US')}
                                                </td>
                                                <td className="p-2 text-right font-medium">
                                                    {(item.qty * (item.unitPrice || 0)).toLocaleString('en-US')}
                                                </td>
                                            </tr>
                                            {trunkItem && accessoryItem && (
                                                <tr className="border-b dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800/50 align-bottom">
                                                    <td className="p-2 font-semibold">Trunk / Accessories</td>
                                                    <td className="p-2">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="text-xs text-gray-500 dark:text-gray-400">Trunk</label>
                                                                <select
                                                                    value={trunkItem.selectedOption || ''}
                                                                    onChange={e => handleOptionChange(trunkItem.id, e.target.value)}
                                                                    disabled={!trunkOptions || trunkOptions.length === 0}
                                                                    className="w-full p-1 bg-transparent border rounded-md dark:border-gray-600 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700"
                                                                >
                                                                    <option value="None">None</option>
                                                                    {trunkOptions?.map(opt => (
                                                                        <option key={opt.name} value={opt.name}>{opt.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="text-xs text-gray-500 dark:text-gray-400">Optional Accessory</label>
                                                                <select
                                                                    value={accessoryItem.selectedOption || ''}
                                                                    onChange={e => handleOptionChange(accessoryItem.id, e.target.value)}
                                                                    disabled={!accessoryOptions || accessoryOptions.length === 0}
                                                                    className="w-full p-1 bg-transparent border rounded-md dark:border-gray-600 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700"
                                                                >
                                                                    <option value="None">None</option>
                                                                    {accessoryOptions?.map(opt => (
                                                                        <option key={opt.name} value={opt.name}>{opt.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-2 text-right">
                                                        <input type="number" readOnly value={trunkItem.qty} className="w-20 p-1 text-right bg-gray-100 dark:bg-gray-800 border rounded-md dark:border-gray-600" />
                                                    </td>
                                                    <td className="p-2 text-right font-medium">
                                                        {totalAccessoryUnitPrice.toLocaleString('en-US')}
                                                    </td>
                                                    <td className="p-2 text-right font-medium">
                                                        {totalAccessoryPrice.toLocaleString('en-US')}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                } else if (item.isTrunk || item.isAccessory) {
                                    return null;
                                }
                                return (
                                    <tr key={item.id} className="border-b dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800/50">
                                        <td className="p-2 font-semibold">{item.description}</td>
                                        <td className="p-2 text-gray-600 dark:text-gray-400">{item.sub}</td>
                                        <td className="p-2 text-right">
                                            <input type="number" value={item.qty} onChange={e => handleItemChange(item.id, 'qty', parseFloat(e.target.value))} step="0.1" className="w-20 p-1 text-right bg-transparent border rounded-md dark:border-gray-600" />
                                        </td>
                                        <td className="p-2 text-right">
                                            <input type="number" value={item.unitPrice} onChange={e => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value))} className="w-28 p-1 text-right bg-transparent border rounded-md dark:border-gray-600" />
                                        </td>
                                        <td className="p-2 text-right font-medium">{(item.qty * item.unitPrice).toLocaleString('en-US')}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span>Equipment Cost</span>
                            <span className="font-semibold text-right w-32">{equipmentCost.toLocaleString('en-US')}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>Surcharge (excl. pipes)</span>
                            <div className="flex items-center">
                                <input type="number" value={surchargePercent} onChange={e => setSurchargePercent(parseFloat(e.target.value))} className="w-16 p-1 text-right bg-transparent border rounded-md dark:border-gray-600 mr-1" /> %
                                <span className="font-semibold text-right w-32">{surchargeAmount.toLocaleString('en-US')}</span>
                            </div>
                        </div>
                         <div className="flex justify-between items-center">
                            <span>Service/Startup</span>
                            <span className="font-semibold text-right w-32">{serviceCost.toLocaleString('en-US')}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>Shipping Costs</span>
                            <span className="font-semibold text-right w-32">{shippingCost.toLocaleString('en-US')}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>Escalation</span>
                            <span className="font-semibold text-right w-32">{escalationCost.toLocaleString('en-US')}</span>
                        </div>
                         <div className="flex justify-between items-center pt-2 border-t dark:border-gray-700">
                            <span className="italic">Sub-total</span>
                            <span className="font-semibold text-right w-32">{totalCostBeforeProvision.toLocaleString('en-US')}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>Standard Provision</span>
                             <div className="flex items-center">
                                <input type="number" value={provisionPercent} onChange={e => setProvisionPercent(parseFloat(e.target.value))} className="w-16 p-1 text-right bg-transparent border rounded-md dark:border-gray-600 mr-1" /> %
                                <span className="font-semibold text-right w-32">{provisionAmount.toLocaleString('en-US')}</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center font-bold pt-2 border-t-2 dark:border-gray-600">
                            <span>Total Self-Cost</span>
                            <span className="text-right w-32">{totalSelfCost.toLocaleString('en-US')}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>Profit Margin</span>
                            <div className="flex items-center">
                                <input type="number" value={profitMarginPercent} onChange={e => setProfitMarginPercent(parseFloat(e.target.value))} className="w-16 p-1 text-right bg-transparent border rounded-md dark:border-gray-600 mr-1" /> %
                                <span className="font-semibold text-right w-32">{profitAmount.toLocaleString('en-US')}</span>
                            </div>
                        </div>
                         <div className="flex justify-between items-center font-bold text-xl p-2 bg-blue-100 dark:bg-blue-900/50 rounded-md">
                            <span>Sales Price</span>
                            <span className="text-right">{salesPriceNOK.toLocaleString('nb-NO', { style: 'currency', currency: 'NOK' })}</span>
                        </div>
                    </div>
                    
                    <div className="space-y-2 self-end">
                         <div className="flex items-center">
                            <span className="w-24">Currency: USD</span>
                            <span className="w-16">Rate:</span>
                            <input type="number" step="0.01" value={usdRate} onChange={e => setUsdRate(parseFloat(e.target.value))} className="w-24 p-1 text-right bg-transparent border rounded-md dark:border-gray-600" />
                            <div className="ml-4 p-2 font-bold text-right flex-1 bg-gray-200 dark:bg-gray-800 rounded-md">
                                {salesPriceUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                            </div>
                            <button onClick={() => onUpdateProjectPrice(salesPriceUSD, Currency.USD)} className="ml-2 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Use this Price</button>
                        </div>
                         <div className="flex items-center">
                            <span className="w-24">Currency: EUR</span>
                            <span className="w-16">Rate:</span>
                            <input type="number" step="0.01" value={eurRate} onChange={e => setEurRate(parseFloat(e.target.value))} className="w-24 p-1 text-right bg-transparent border rounded-md dark:border-gray-600" />
                            <div className="ml-4 p-2 font-bold text-right flex-1 bg-gray-200 dark:bg-gray-800 rounded-md">
                               {salesPriceEUR.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                            </div>
                             <button onClick={() => onUpdateProjectPrice(salesPriceEUR, Currency.EUR)} className="ml-2 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Use this Price</button>
                        </div>
                        <div className="p-2 mt-4 bg-yellow-100 dark:bg-yellow-900/50 rounded-md">
                            <p className="font-semibold">Comments:</p>
                            <p>Kirk says WMMP is approx. USD 100,000 incl. stainless pipe / hydraulics.</p>
                            <p>Yard states that the Framo price is RMB 2,255,000 (approx. USD 315K with a rate of 0.140).</p>
                            <p className="mt-2 text-xs italic">Note from PDF: Cost Price Plate: €5.50, Cost Price Pipe: €7.00</p>
                        </div>
                    </div>
                </div>

            </div>
        </Modal>
    );
};