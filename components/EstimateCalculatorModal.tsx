import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from './Modal';
import type { Project, Company, TeamMember } from '../types';
import { Currency, ProjectType } from '../types';
import { PRICING_DATA } from '../data/pricingData';
import type { Accessory, PumpPriceData, PumpVariant } from '../data/pricingData';
import { DollarIcon } from './icons';

// Formatting helpers
function fmtInt(n: number): string {
    return Math.ceil(n || 0).toLocaleString('en-US');
}
function fmtCurrency(n: number, locale: string, currency: string): string {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(Math.ceil(n || 0));
}

interface LineItem {
    id: string;
    description: string;
    sub?: string;
    isPump?: boolean;
    isMotor?: boolean;
    isStarter?: boolean;
    isValve?: boolean;
    isLevelSwitch?: boolean;
    isTrunk?: boolean;
    isAccessory?: boolean;
    isPumpAddition?: boolean;
    isMotorAddition?: boolean;
    isStarterAddition?: boolean;
    isValveExtra?: boolean;
    isControlSystem?: boolean;
    isMeasurement?: boolean;
    isOtherEquipment?: boolean;
    isClassCert?: boolean;
    isValveEH?: boolean;
    pumpType?: string;
    pumpVariant?: PumpVariant;
    pumpLength?: number;
    flangeType?: 'DIN (ISO)' | 'JIS';
    motorVariant?: 'NON EX-Proof' | 'EX-Proof';
    motorModel?: string;
    motorKw?: number;
    starterType?: 'DOL' | 'SOFT' | 'YD' | 'VFD';
    starterRange?: string;
    valveActing?: 'Single-acting' | 'Double-acting';
    valveModel?: string;
    levelSwitchModel?: string;
    classSociety?: string;
    classBracket?: string;
    selectedOption?: string;
    qty: number;
    unitPrice: number;
}

interface EstimateCalculatorModalProps {
    onClose: () => void;
    project: Project;
    companies: Company[];
    teamMembers: TeamMember[];
    onUpdateProjectPrice: (price: number, currency: Currency, selfCostPerVessel?: number) => void;
}

const pumpVariantDescriptions: { [key: string]: string } = {
    CS: 'CS** = Cofferdam + Strip',
    CST: 'CST* = Cofferdam + Strip + Temp sensor',
    CSTV: 'CSTV = Cofferdam + Strip + Temp sensor + Vacuumdrain',
};

const AH_PUMP_TYPES = ['RBP-250', 'RBP-300', 'RBP-400'] as const;
const FLANGE_TYPES = ['DIN (ISO)', 'JIS'] as const;

type MotorOption = { model: string; kw: number; type?: 'N' | 'HO'; price: number; iict4?: number };
const AH_MOTORS_NON_EX: MotorOption[] = (PRICING_DATA.antiHeeling?.motors?.nonEx as MotorOption[]) || [];
const AH_MOTORS_EX_PROOF: MotorOption[] = (PRICING_DATA.antiHeeling?.motors?.exProof as MotorOption[]) || [];

const getInitialLineItems = (isAntiHeeling: boolean): LineItem[] => {
    if (isAntiHeeling) {
        // Minimal Anti-Heeling initial setup; pricing to be provided later
        const initialQty = 2;
        const defaultMotorVariant: 'NON EX-Proof' | 'EX-Proof' = 'NON EX-Proof';
        const defaultMotorList = defaultMotorVariant === 'NON EX-Proof' ? AH_MOTORS_NON_EX : AH_MOTORS_EX_PROOF;
        const defaultMotor = defaultMotorList[7] || defaultMotorList[0]; // prefer ~37kW if present
        const starterKeys = Object.keys((PRICING_DATA.antiHeeling?.starters?.DOL as Record<string, number>) || {});
        const defaultStarterRange = (starterKeys[1] || starterKeys[0] || '0-20kW');
        const defaultStarterType: 'DOL' | 'SOFT' = 'DOL';
        const starterPrice = (PRICING_DATA.antiHeeling?.starters?.[defaultStarterType] as Record<string, number> | undefined)?.[defaultStarterRange] || 0;

        const valveSingleKeys = Object.keys((PRICING_DATA.antiHeeling?.valvesPneumatic?.singleActing as Record<string, number>) || {});
        const defaultValveModel = valveSingleKeys[0] || '';
        const defaultValvePrice = (PRICING_DATA.antiHeeling?.valvesPneumatic?.singleActing as Record<string, number> | undefined)?.[defaultValveModel] || 0;
        const valveDoubleKeys = Object.keys((PRICING_DATA.antiHeeling?.valvesPneumatic?.doubleActing as Record<string, number>) || {});
        const defaultValveModelDouble = valveDoubleKeys[0] || '';
        const defaultValvePriceDouble = (PRICING_DATA.antiHeeling?.valvesPneumatic?.doubleActing as Record<string, number> | undefined)?.[defaultValveModelDouble] || 0;
        const levelSwitchKeys = Object.keys((PRICING_DATA.antiHeeling?.levelSwitches as Record<string, number>) || {});
        const defaultLevelSwitch = levelSwitchKeys[0] || '';
        const defaultLevelSwitchPrice = (PRICING_DATA.antiHeeling?.levelSwitches as Record<string, number> | undefined)?.[defaultLevelSwitch] || 0;
        const valveEHSingleKeys = Object.keys((PRICING_DATA.antiHeeling?.valvesElectricPure?.singleActing as Record<string, number>) || {}).filter(k => !k.startsWith('DN200'));
        const valveEHDoubleKeys = Object.keys((PRICING_DATA.antiHeeling?.valvesElectricPure?.doubleActing as Record<string, number>) || {}).filter(k => !k.startsWith('DN200'));
        const defaultValveEH = valveEHSingleKeys[0] || '';
        const defaultValveEHPrice = (PRICING_DATA.antiHeeling?.valvesElectricPure?.singleActing as Record<string, number> | undefined)?.[defaultValveEH] || 0;
        const defaultValveEHDouble = valveEHDoubleKeys[0] || '';
        const defaultValveEHDoublePrice = (PRICING_DATA.antiHeeling?.valvesElectricPure?.doubleActing as Record<string, number> | undefined)?.[defaultValveEHDouble] || 0;
        // class certification default
        const classSoc = 'DNV';
        const classBr = '<100kW';
        const clsPart = (((PRICING_DATA.antiHeeling?.classCertification || {}) as any)[classSoc] || {})[classBr] || { pump: 0, price2: 0, price3: 0, system: 0 };
        const classSum = (clsPart.pump || 0) + (clsPart.price2 || 0) + (clsPart.price3 || 0) + (clsPart.system || 0);

        return [
            { id: '1', description: 'Pump Type', isPump: true, pumpType: AH_PUMP_TYPES[0], flangeType: FLANGE_TYPES[0], qty: initialQty, unitPrice: (PRICING_DATA.antiHeeling?.pumps?.[AH_PUMP_TYPES[0]] as number) || 0 },
            { id: '1pa', description: 'Manometer', sub: undefined, isPumpAddition: true, qty: initialQty, unitPrice: (PRICING_DATA.antiHeeling?.pumpAdditions?.['Manometer'] as number) || 0 },
            
            { id: '1m', description: 'Motor Type', isMotor: true, motorVariant: defaultMotorVariant, motorModel: defaultMotor.model, motorKw: defaultMotor.kw, qty: initialQty, unitPrice: defaultMotor.price + (defaultMotor.iict4 || 0) },
            { id: '1s', description: 'Starter', isStarter: true, starterType: defaultStarterType, starterRange: defaultStarterRange, qty: initialQty, unitPrice: starterPrice },
            { id: '1sa', description: 'Starter Addition', sub: 'Local switch', isStarterAddition: true, qty: 1, unitPrice: (PRICING_DATA.antiHeeling?.starterAdditions?.['Local switch'] as number) || 0 },
            { id: '1v', description: 'Pneum. Valve', isValve: true, valveActing: 'Single-acting', valveModel: defaultValveModel, qty: initialQty, unitPrice: defaultValvePrice },
            { id: '1v2', description: 'Pneum. Valve', isValve: true, valveActing: 'Double-acting', valveModel: defaultValveModelDouble, qty: initialQty, unitPrice: defaultValvePriceDouble },
            { id: '1vh', description: 'Electric Valve', isValveEH: true, valveActing: 'Single-acting', valveModel: defaultValveEH, qty: initialQty, unitPrice: defaultValveEHPrice },
            { id: '1vh2', description: 'Electric Valve', isValveEH: true, valveActing: 'Double-acting', valveModel: defaultValveEHDouble, qty: initialQty, unitPrice: defaultValveEHDoublePrice },
            { id: '1l', description: 'Level Switch', isLevelSwitch: true, levelSwitchModel: defaultLevelSwitch, qty: 4, unitPrice: defaultLevelSwitchPrice },
            { id: '1meas', description: 'Measurement', sub: 'Pump pressure in/out', isMeasurement: true, qty: 1, unitPrice: (PRICING_DATA.antiHeeling?.measurement?.['Pump pressure in/out'] as number) || 0 },
            { id: '1cs', description: 'Control Unit / Panel', sub: 'Standard desk mounting', isControlSystem: true, qty: 1, unitPrice: (PRICING_DATA.antiHeeling?.controlSystemAH?.['Standard desk mounting'] as number) || 0 },
            { id: '1css', description: 'Control Unit / Panel', sub: 'Slave desk mounting', isControlSystem: true, qty: 0, unitPrice: (PRICING_DATA.antiHeeling?.controlSystemAH?.['Slave desk mounting'] as number) || 0 },
            { id: '1csd', description: 'Screen size, addition', sub: '15" screen', isControlSystem: true, qty: 0, unitPrice: (PRICING_DATA.antiHeeling?.controlSystemAH?.['15" screen'] as number) || 0 },
            
            { id: '1ve1', description: 'Valve Extra', sub: 'Cast steel body', isValveExtra: true, qty: 0, unitPrice: (PRICING_DATA.antiHeeling?.valveExtras?.['Cast steel body'] as number) || 0 },
            { id: '1ve2', description: 'Valve Extra', sub: 'HandWheel', isValveExtra: true, qty: 0, unitPrice: (PRICING_DATA.antiHeeling?.valveExtras?.['HandWheel'] as number) || 0 },
            { id: '1ox1', description: 'Other Equipment', sub: 'EX-proof actuator', isOtherEquipment: true, qty: 0, unitPrice: (PRICING_DATA.antiHeeling?.otherEquipment?.['EX-proof actuator'] as number) || 0 },
            { id: '1ox2', description: 'Other Equipment', sub: 'EX-proof switch', isOtherEquipment: true, qty: 0, unitPrice: (PRICING_DATA.antiHeeling?.otherEquipment?.['EX-proof switch'] as number) || 0 },
            { id: '1ox3', description: 'Other Equipment', sub: 'Counter flanges', isOtherEquipment: true, qty: 0, unitPrice: (PRICING_DATA.antiHeeling?.otherEquipment?.['Counter flanges'] as number) || 0 },
            { id: '1ox4', description: 'Other Equipment', sub: 'Spare parts', isOtherEquipment: true, qty: 0, unitPrice: (PRICING_DATA.antiHeeling?.otherEquipment?.['Spare parts'] as number) || 0 },
            { id: '1cc', description: 'Class Certification', isClassCert: true, classSociety: classSoc, classBracket: classBr, qty: 1, unitPrice: classSum },
        ];
    }
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
    ];
};

export const EstimateCalculatorModal: React.FC<EstimateCalculatorModalProps> = ({ onClose, project, companies, teamMembers, onUpdateProjectPrice }) => {
    const isAH = project.projectType === ProjectType.ANTI_HEELING;

    const [lineItems, setLineItems] = useState<LineItem[]>(getInitialLineItems(!!isAH));
    const [showExtras, setShowExtras] = useState(false);
    const [usdRate, setUsdRate] = useState(8.7);
    const [eurRate, setEurRate] = useState(11.7);
    const [adminPercent, setAdminPercent] = useState(40);
    const [agentCommissionPercent, setAgentCommissionPercent] = useState(4.0);
    const [profitMarginPercent, setProfitMarginPercent] = useState(50.0);
    const [bottomPercent, setBottomPercent] = useState(20.0);
    const [extraCommissioningDays, setExtraCommissioningDays] = useState<number>(0);
    const [comments, setComments] = useState<string>(
        [
            'Kirk says WMMP is approx. USD 100,000 incl. stainless pipe / hydraulics.',
            'Yard states that the Framo price is RMB 2,255,000 (approx. USD 315K with a rate of 0.140).',
            'Note from PDF: Cost Price Plate: €5.50, Cost Price Pipe: €7.00'
        ].join('\n')
    );
    const EXTRA_DAY_RATE = 12000;
    const [startupLocation, setStartupLocation] = useState<string>(() => Object.keys((PRICING_DATA.antiHeeling?.startupLocations as any) || {})[0] || '');
    const startupAverage = useMemo(() => {
        const row = ((PRICING_DATA.antiHeeling?.startupLocations as any) || {})[startupLocation] || {};
        return Number(row.average || 0);
    }, [startupLocation]);

    const extrasRows = useMemo(() => {
        if (!isAH) return [] as LineItem[];
        return lineItems.filter(item =>
            (item.isPumpAddition && item.id !== '1pa') ||
            item.isMotorAddition || item.isStarterAddition || item.isValveExtra || item.isMeasurement || item.isControlSystem || item.isOtherEquipment
        );
    }, [isAH, lineItems]);
    const extrasActiveCount = useMemo(() => extrasRows.filter(i => (i.qty || 0) > 0).length, [extrasRows]);
    const extrasTotal = useMemo(() => extrasRows.reduce((acc, it) => acc + (it.qty * (it.unitPrice || 0)), 0), [extrasRows]);

    const [extrasOpen, setExtrasOpen] = useState({
        control: false,
        valveExtras: false,
        pump: false,
        motor: false,
        starter: false,
        measurement: false,
        other: false,
    });
    const extrasControl = useMemo(() => lineItems.filter(i => i.isControlSystem), [lineItems]);
    const extrasValveExtras = useMemo(() => lineItems.filter(i => i.isValveExtra), [lineItems]);
    const extrasPump = useMemo(() => lineItems.filter(i => i.isPumpAddition && i.id !== '1pa'), [lineItems]);
    const extrasMotor = useMemo(() => lineItems.filter(i => i.isMotorAddition), [lineItems]);
    const extrasStarter = useMemo(() => lineItems.filter(i => i.isStarterAddition), [lineItems]);
    const extrasMeasurement = useMemo(() => lineItems.filter(i => i.isMeasurement), [lineItems]);
    const extrasOther = useMemo(() => lineItems.filter(i => i.isOtherEquipment), [lineItems]);

    const shipyard = useMemo(() => companies.find(c => c.id === project.shipyardId), [companies, project.shipyardId]);
    const vesselOwner = useMemo(() => project.vesselOwnerId ? companies.find(c => c.id === project.vesselOwnerId) : undefined, [companies, project.vesselOwnerId]);
    const salesRep = useMemo(() => project.salesRepId ? teamMembers.find(m => m.id === project.salesRepId) : undefined, [teamMembers, project.salesRepId]);

    // Persist/load lightweight estimator state per project
    const storageKey = useMemo(() => `estimator_state_${project.id}`, [project.id]);
    const saveEstimatorState = () => {
        try {
            const payload = {
                lineItems,
                adminPercent,
                agentCommissionPercent,
                profitMarginPercent,
                bottomPercent,
                usdRate,
                eurRate,
                extraCommissioningDays,
                comments,
                shippingRegion,
                shippingAutoMap,
                startupLocation,
            };
            localStorage.setItem(storageKey, JSON.stringify(payload));
        } catch {}
    };
    useEffect(() => {
        try {
            const raw = localStorage.getItem(storageKey);
            if (!raw) return;
            const s = JSON.parse(raw);
            if (s && typeof s === 'object') {
                if (Array.isArray(s.lineItems)) setLineItems(s.lineItems);
                if (typeof s.adminPercent === 'number') setAdminPercent(s.adminPercent);
                if (typeof s.agentCommissionPercent === 'number') setAgentCommissionPercent(s.agentCommissionPercent);
                if (typeof s.profitMarginPercent === 'number') setProfitMarginPercent(s.profitMarginPercent);
                if (typeof s.bottomPercent === 'number') setBottomPercent(s.bottomPercent);
                if (typeof s.usdRate === 'number') setUsdRate(s.usdRate);
                if (typeof s.eurRate === 'number') setEurRate(s.eurRate);
                if (typeof s.extraCommissioningDays === 'number') setExtraCommissioningDays(s.extraCommissioningDays);
                if (typeof s.comments === 'string') setComments(s.comments);
                if (typeof s.shippingRegion === 'string') setShippingRegion(s.shippingRegion);
                if (typeof s.shippingAutoMap === 'boolean') setShippingAutoMap(s.shippingAutoMap);
                if (typeof s.startupLocation === 'string') setStartupLocation(s.startupLocation);
            }
        } catch {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storageKey]);

    const handleItemChange = (id: string, field: 'qty' | 'unitPrice', value: number) => {
        setLineItems(prev => {
            let updatedItems = prev.map(item => item.id === id ? { ...item, [field]: value } : item);

            const changedItem = updatedItems.find(item => item.id === id);
            if (changedItem?.isPump && field === 'qty') {
                updatedItems = updatedItems.map(item => {
                    if (item.isMotor || item.isStarter || item.isValve || item.isValveEH) {
                        return { ...item, qty: value };
                    }
                    if (item.isPumpAddition && item.id === '1pa' && (item.qty || 0) > 0) {
                        return { ...item, qty: value };
                    }
                    return item;
                });
            }

            // If quantities of valves or motor variant changed, re-sync EX-proof actuator qty
            if (field === 'qty' && (changedItem?.isValve || changedItem?.isValveEH || changedItem?.isMotor)) {
                updatedItems = recalcExProofActuatorQty(updatedItems);
            }

            return updatedItems;
        });
    };

    const handlePumpSelectionChange = (field: 'pumpType' | 'pumpVariant' | 'pumpLength' | 'flangeType', value: string | number) => {
        setLineItems(prevItems => {
            const newItems = [...prevItems];
            const pumpItemIndex = newItems.findIndex(item => item.isPump);
            if (pumpItemIndex === -1) return newItems;

            const pumpItem = { ...newItems[pumpItemIndex] };

            if (field === 'pumpType' && typeof value === 'string') {
                const newPumpType = value;
                if (pumpItem.pumpType !== newPumpType) {
                    pumpItem.pumpType = newPumpType;
                    const newPumpData = (PRICING_DATA.cargoPumps as Record<string, PumpPriceData>)[String(pumpItem.pumpType)];
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
            } else if (field === 'flangeType' && typeof value === 'string') {
                pumpItem.flangeType = value as 'DIN (ISO)' | 'JIS';
            } else if (field === 'pumpVariant' && typeof value === 'string') {
                pumpItem.pumpVariant = value as PumpVariant;
            } else if (field === 'pumpLength' && typeof value === 'number') {
                pumpItem.pumpLength = value;
            }

            // Recalculate price
            if (pumpItem.pumpType && !isAH) {
                const pumpData = (PRICING_DATA.cargoPumps as Record<string, PumpPriceData>)[String(pumpItem.pumpType)];
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
            } else if (isAH) {
                // Apply Anti-Heeling pump base prices in NOK
                const pt = pumpItem.pumpType as (typeof AH_PUMP_TYPES)[number] | undefined;
                pumpItem.unitPrice = pt ? ((PRICING_DATA.antiHeeling?.pumps?.[pt] as number) ?? 0) : 0;
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

            const pumpData = (PRICING_DATA.cargoPumps as Record<string, PumpPriceData>)[String(pumpItem.pumpType)];
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

    const handleMotorSelectionChange = (field: 'motorVariant' | 'motorModel', value: string) => {
        setLineItems(prevItems => {
            let newItems = [...prevItems];
            const idx = newItems.findIndex(i => i.isMotor);
            if (idx === -1) return prevItems;
            const motorItem = { ...newItems[idx] };
            if (field === 'motorVariant') {
                motorItem.motorVariant = value as 'NON EX-Proof' | 'EX-Proof';
                // reset model to first in list
                const list = motorItem.motorVariant === 'EX-Proof' ? AH_MOTORS_EX_PROOF : AH_MOTORS_NON_EX;
                const def = list[0];
                motorItem.motorModel = def.model;
                motorItem.motorKw = def.kw;
                motorItem.unitPrice = def.price + (def.iict4 || 0);
            } else if (field === 'motorModel') {
                motorItem.motorModel = value;
                const list = motorItem.motorVariant === 'EX-Proof' ? AH_MOTORS_EX_PROOF : AH_MOTORS_NON_EX;
                const opt = list.find(o => o.model === value) || list[0];
                motorItem.motorKw = opt.kw;
                motorItem.unitPrice = opt.price + (opt.iict4 || 0);
            }
            newItems[idx] = motorItem;
            newItems = recalcExProofActuatorQty(newItems);
            return newItems;
        });
    };

    const handleStarterSelectionChange = (field: 'starterType' | 'starterRange', value: string) => {
        setLineItems(prevItems => {
            const newItems = [...prevItems];
            const idx = newItems.findIndex(i => i.isStarter);
            if (idx === -1) return prevItems;
            const starterItem = { ...newItems[idx] };
            if (field === 'starterType') {
                starterItem.starterType = value as 'DOL' | 'SOFT' | 'YD' | 'VFD';
                // reset range to first available for this type
                const ranges = Object.keys((PRICING_DATA.antiHeeling?.starters?.[starterItem.starterType] as Record<string, number>) || {});
                starterItem.starterRange = ranges[0] || '';
            } else if (field === 'starterRange') {
                starterItem.starterRange = value;
            }
            const priceTable = (PRICING_DATA.antiHeeling?.starters?.[starterItem.starterType || 'DOL'] as Record<string, number>) || {};
            starterItem.unitPrice = priceTable[starterItem.starterRange || ''] || 0;
            newItems[idx] = starterItem;
            return newItems;
        });
    };

    const handleValveSelectionChange = (id: string, field: 'valveActing' | 'valveModel', value: string) => {
        setLineItems(prevItems => {
            let newItems = [...prevItems];
            const idx = newItems.findIndex(i => i.id === id);
            if (idx === -1) return prevItems;
            const valveItem = { ...newItems[idx] };
            if (field === 'valveActing') {
                valveItem.valveActing = value as 'Single-acting' | 'Double-acting';
                const table = (value === 'Double-acting'
                    ? (PRICING_DATA.antiHeeling?.valvesPneumatic?.doubleActing as Record<string, number>)
                    : (PRICING_DATA.antiHeeling?.valvesPneumatic?.singleActing as Record<string, number>)) || {};
                const keys = Object.keys(table);
                valveItem.valveModel = keys[0] || '';
                valveItem.unitPrice = valveItem.valveModel ? (table[valveItem.valveModel] || 0) : 0;
            } else if (field === 'valveModel') {
                valveItem.valveModel = value;
                const table = (valveItem.valveActing === 'Double-acting'
                    ? (PRICING_DATA.antiHeeling?.valvesPneumatic?.doubleActing as Record<string, number>)
                    : (PRICING_DATA.antiHeeling?.valvesPneumatic?.singleActing as Record<string, number>)) || {};
                valveItem.unitPrice = table[value] || 0;
            }
            newItems[idx] = valveItem;
            newItems = recalcExProofActuatorQty(newItems);
            return newItems;
        });
    };

    const recalcExProofActuatorQty = (items: LineItem[]) => {
        const motor = items.find(i => i.isMotor);
        const exActIdx = items.findIndex(i => i.isOtherEquipment && i.sub === 'EX-proof actuator');
        if (exActIdx === -1) return items;
        const next = [...items];
        const exItem = { ...next[exActIdx] };
        if (motor?.motorVariant === 'EX-Proof') {
            const valvesCount = next.filter(i => i.isValve || i.isValveEH).reduce((sum, v) => sum + (v.qty || 0), 0);
            exItem.qty = valvesCount;
        } else {
            exItem.qty = 0;
        }
        next[exActIdx] = exItem;
        return next;
    };

    const handleValveEHChange = (id: string, model: string) => {
        setLineItems(prevItems => {
            const newItems = [...prevItems];
            const idx = newItems.findIndex(i => i.id === id);
            if (idx === -1) return prevItems;
            const ehItem = { ...newItems[idx] };
            ehItem.valveModel = model;
            const singleTable = (PRICING_DATA.antiHeeling?.valvesElectricPure?.singleActing as Record<string, number>) || {};
            const doubleTable = (PRICING_DATA.antiHeeling?.valvesElectricPure?.doubleActing as Record<string, number>) || {};
            const refTable = (ehItem.valveActing === 'Double-acting') ? doubleTable : singleTable;
            ehItem.unitPrice = refTable[model] || 0;
            newItems[idx] = ehItem;
            return newItems;
        });
    };

    const handleValveEHActingChange = (id: string, value: 'Single-acting' | 'Double-acting') => {
        setLineItems(prevItems => {
            const newItems = [...prevItems];
            const idx = newItems.findIndex(i => i.id === id);
            if (idx === -1) return prevItems;
            const ehItem = { ...newItems[idx] };
            ehItem.valveActing = value;
            const singleTable = (PRICING_DATA.antiHeeling?.valvesElectricPure?.singleActing as Record<string, number>) || {};
            const doubleTable = (PRICING_DATA.antiHeeling?.valvesElectricPure?.doubleActing as Record<string, number>) || {};
            const refTable = value === 'Double-acting' ? doubleTable : singleTable;
            const refKeys = Object.keys(refTable).filter(k => !k.startsWith('DN200'));
            const currentModel = ehItem.valveModel && refTable[ehItem.valveModel] !== undefined && !ehItem.valveModel.startsWith('DN200') ? ehItem.valveModel : (refKeys[0] || '');
            ehItem.valveModel = currentModel;
            ehItem.unitPrice = refTable[currentModel] || 0;
            newItems[idx] = ehItem;
            return newItems;
        });
    };

    const handleLevelSwitchChange = (model: string) => {
        setLineItems(prevItems => {
            const newItems = [...prevItems];
            const idx = newItems.findIndex(i => i.isLevelSwitch);
            if (idx === -1) return prevItems;
            const lsItem = { ...newItems[idx] };
            lsItem.levelSwitchModel = model;
            const table = (PRICING_DATA.antiHeeling?.levelSwitches as Record<string, number>) || {};
            lsItem.unitPrice = table[model] || 0;
            newItems[idx] = lsItem;
            return newItems;
        });
    };

    const handleClassCertChange = (field: 'society' | 'bracket', value: string) => {
        setLineItems(prevItems => {
            const items = [...prevItems];
            const idx = items.findIndex(i => i.isClassCert);
            if (idx === -1) return prevItems;
            const it = { ...items[idx] };

            // Update requested field
            if (field === 'society') {
                it.classSociety = value;
                // When society changes, ensure bracket is valid for that society
                const socTable = ((PRICING_DATA.antiHeeling?.classCertification as any) || {})[value] || {};
                const brs = Object.keys(socTable);
                if (!brs.includes(it.classBracket || '')) {
                    it.classBracket = brs[0] || '';
                }
            }
            if (field === 'bracket') {
                it.classBracket = value;
            }

            // Resolve with safe defaults from data when missing
            const socAll = (PRICING_DATA.antiHeeling?.classCertification as any) || {};
            const soc = it.classSociety && socAll[it.classSociety] ? it.classSociety : Object.keys(socAll)[0];
            const socTable = (socAll[soc] as any) || {};
            const br = it.classBracket && socTable[it.classBracket] !== undefined ? it.classBracket : Object.keys(socTable)[0];

            const part = (socTable[br] as any) || { pump: 0, price2: 0, price3: 0, system: 0 };
            it.classSociety = soc;
            it.classBracket = br;
            it.unitPrice = (part.pump || 0) + (part.price2 || 0) + (part.price3 || 0) + (part.system || 0);
            items[idx] = it;
            return items;
        });
    };


    const equipmentCost = useMemo(() => {
        return lineItems.reduce((acc, item) => acc + (item.qty * (item.unitPrice || 0)), 0);
    }, [lineItems]);
    
    const [shippingRegion, setShippingRegion] = useState<string>(() => Object.keys((PRICING_DATA.antiHeeling?.shippingByCommissioningRegion as any) || {})[0] || 'Norway');
    const [shippingAutoMap, setShippingAutoMap] = useState<boolean>(true);
    const shippingCost = useMemo(() => {
        const table = (PRICING_DATA.antiHeeling?.shippingByCommissioningRegion as Record<string, number>) || {};
        const key = shippingRegion && table[shippingRegion] !== undefined ? shippingRegion : Object.keys(table)[0];
        return (key ? table[key] : 0) || 0;
    }, [shippingRegion]);

    // Map Startup location to a shipping region (simple keyword mapping)
    const mapStartupToRegion = (loc: string): string => {
        const l = (loc || '').toLowerCase();
        if (l.includes('norway') || l.includes('vard') || l.includes('ulstein')) return 'Norway';
        if (l.includes('romania') || l.includes('turkey') || l.includes('tyrk') || l.includes('balkan') || l.includes('east')) return 'Romania/Turkey/East Europe';
        if (
            l.includes('korea') || l.includes('china') || l.includes('shanghai') || l.includes('guangzhou') || l.includes('dalian') || l.includes('japan') || l.includes('philippines') || l.includes('subic') || l.includes('shi') || l.includes('dsme') || l.includes('hhi') || l.includes('hmd') || l.includes('singapore')
        ) return 'Asia';
        if (l.includes('usa') || l.includes('houston')) return 'USA';
        if (l.includes('canada')) return 'Canada';
        // Default bucket: Europe
        return 'Europe';
    };

    useEffect(() => {
        if (!isAH) return;
        if (!shippingAutoMap) return;
        const next = mapStartupToRegion(startupLocation);
        setShippingRegion(next);
    }, [startupLocation, shippingAutoMap, isAH]);
    const startupCost = startupAverage || 0;
    const extraCommissioningCost = useMemo(() => {
        const d = Number.isFinite(extraCommissioningDays) ? extraCommissioningDays : 0;
        return Math.max(0, d) * EXTRA_DAY_RATE;
    }, [extraCommissioningDays]);
    const adminAmount = useMemo(() => {
        return equipmentCost * (adminPercent / 100);
    }, [equipmentCost, adminPercent]);
    const vkxskp = useMemo(() => equipmentCost + adminAmount, [equipmentCost, adminAmount]);

    // Sub-Total = Full Cost (VKxSKP) + Startup + Shipping + Extra Days
    const subTotal = useMemo(() => {
        return vkxskp + startupCost + shippingCost + extraCommissioningCost;
    }, [vkxskp, startupCost, shippingCost, extraCommissioningCost]);
    
    const agentCommissionAmount = useMemo(() => {
        return subTotal * (agentCommissionPercent / 100);
    }, [subTotal, agentCommissionPercent]);

    // Total Cost includes Sub-Total + Agent Commission
    const totalSelfCost = useMemo(() => {
        return subTotal + agentCommissionAmount;
    }, [subTotal, agentCommissionAmount]);

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
    const bottomAmount = useMemo(() => totalSelfCost * (bottomPercent / 100), [totalSelfCost, bottomPercent]);
    const bottomPriceNOK = useMemo(() => totalSelfCost + bottomAmount, [totalSelfCost, bottomAmount]);

    const targetPriceDisplay = useMemo(() => {
        if (project.currency === Currency.USD) return fmtCurrency(salesPriceUSD, 'en-US', 'USD');
        if (project.currency === Currency.EUR) return fmtCurrency(salesPriceEUR, 'de-DE', 'EUR');
        return fmtCurrency(salesPriceNOK, 'nb-NO', 'NOK');
    }, [project.currency, salesPriceUSD, salesPriceEUR, salesPriceNOK]);

    const bottomPriceDisplay = useMemo(() => {
        if (project.currency === Currency.USD) return fmtCurrency(bottomPriceNOK / usdRate, 'en-US', 'USD');
        if (project.currency === Currency.EUR) return fmtCurrency(bottomPriceNOK / eurRate, 'de-DE', 'EUR');
        return fmtCurrency(bottomPriceNOK, 'nb-NO', 'NOK');
    }, [project.currency, bottomPriceNOK, usdRate, eurRate]);
    
    const pumpItem = lineItems.find(item => item.isPump);
    const trunkItem = lineItems.find(item => item.isTrunk);
    const accessoryItem = lineItems.find(item => item.isAccessory);

    // Use-this-price handler: save local estimator state and forward the chosen price
    const handleUseThisPrice = (amount: number, currency: Currency) => {
        saveEstimatorState();
        // Persist both the chosen quote price and the self cost per vessel.
        // Convert totalSelfCost (computed in NOK) into the selected project currency so GM% is correct.
        const selfCostInCurrency = (() => {
            if (currency === Currency.USD) return totalSelfCost / (usdRate || 1);
            if (currency === Currency.EUR) return totalSelfCost / (eurRate || 1);
            return totalSelfCost; // NOK
        })();
        onUpdateProjectPrice(amount, currency, selfCostInCurrency);
    };

    // ... formatting helpers are defined at module scope

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
                                    const pumpData = (PRICING_DATA.cargoPumps as Record<string, PumpPriceData>)[String(pumpItem.pumpType)];
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
                                                    <div className="font-semibold">{isAH ? 'Pump Type' : item.description}</div>
                                                    {isAH ? (
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 font-normal mt-1">
                                                            {(pumpItem?.flangeType || FLANGE_TYPES[0]) + ' • ' + (pumpItem?.pumpType || AH_PUMP_TYPES[0])}
                                                        </div>
                                                    ) : (
                                                        pumpItem?.pumpVariant && pumpVariantDescriptions[pumpItem.pumpVariant] && (
                                                            <div className="text-xs text-gray-500 dark:text-gray-400 font-normal mt-1">
                                                                {pumpVariantDescriptions[pumpItem.pumpVariant]}
                                                            </div>
                                                        )
                                                    )}
                                                </td>
                                                <td className="p-2">
                                                    {isAH ? (
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <div>
                                                                <label className="text-xs text-gray-500 dark:text-gray-400">Flange Type</label>
                                                                <select value={item.flangeType || FLANGE_TYPES[0]} onChange={e => handlePumpSelectionChange('flangeType', e.target.value)} className="w-full p-1 bg-transparent border rounded-md dark:border-gray-600">
                                                                    {FLANGE_TYPES.map(ft => (
                                                                        <option key={ft} value={ft}>{ft}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="text-xs text-gray-500 dark:text-gray-400">Pump Type</label>
                                                                <select value={item.pumpType} onChange={e => handlePumpSelectionChange('pumpType', e.target.value)} className="w-full p-1 bg-transparent border rounded-md dark:border-gray-600">
                                                                    {AH_PUMP_TYPES.map(p => (
                                                                        <option key={p} value={p}>{p}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div className="flex items-end">
                                                                <div className="flex items-center gap-2 w-full">
                                                                    <input
                                                                        id="include-manometer"
                                                                        type="checkbox"
                                                                        className="h-4 w-4"
                                                                        checked={(lineItems.find(i => i.id === '1pa')?.qty || 0) > 0}
                                                                        onChange={e => setLineItems(prev => {
                                                                            const arr = [...prev];
                                                                            const manIdx = arr.findIndex(i => i.id === '1pa');
                                                                            if (manIdx > -1) {
                                                                                const pQty = (arr.find(i => i.isPump)?.qty) || 0;
                                                                                arr[manIdx] = { ...arr[manIdx], qty: e.target.checked ? pQty : 0 };
                                                                            }
                                                                            return arr;
                                                                        })}
                                                                    />
                                                                    <label htmlFor="include-manometer" className="text-sm">Manometer</label>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
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
                                                    )}
                                                </td>
                                                <td className="p-2 text-right">
                                                    <input type="number" value={item.qty} onChange={e => handleItemChange(item.id, 'qty', parseFloat(e.target.value))} className="w-20 p-1 text-right bg-transparent border rounded-md dark:border-gray-600" />
                                                </td>
                                                <td className="p-2 text-right font-medium">
                                                    {fmtInt(item.unitPrice || 0)}
                                                </td>
                                                <td className="p-2 text-right font-medium">
                                                    {fmtInt(item.qty * (item.unitPrice || 0))}
                                                </td>
                                            </tr>
                                            {!isAH && trunkItem && accessoryItem && (
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
                                                            {fmtInt(totalAccessoryUnitPrice)}
                                                        </td>
                                                        <td className="p-2 text-right font-medium">
                                                            {fmtInt(totalAccessoryPrice)}
                                                        </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                } else if (item.isMotor) {
                                    const options = item.motorVariant === 'EX-Proof' ? AH_MOTORS_EX_PROOF : AH_MOTORS_NON_EX;
                                    return (
                                        <tr key={item.id} className="border-b dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800/50">
                                            <td className="p-2">
                                                <div className="font-semibold">Motor Type</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 font-normal mt-1">
                                                    {(item.motorVariant || 'NON EX-Proof') + ' • ' + (item.motorModel ? `${item.motorModel}, ${item.motorKw}kW` : `${options[0].model}, ${options[0].kw}kW`)}
                                                </div>
                                            </td>
                                            <td className="p-2">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-xs text-gray-500 dark:text-gray-400">Variant</label>
                                                        <select value={item.motorVariant || 'NON EX-Proof'} onChange={e => handleMotorSelectionChange('motorVariant', e.target.value)} className="w-full p-1 bg-transparent border rounded-md dark:border-gray-600">
                                                            <option>NON EX-Proof</option>
                                                            <option>EX-Proof</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-500 dark:text-gray-400">Motor Model / Size</label>
                                                        <select value={item.motorModel || options[0].model} onChange={e => handleMotorSelectionChange('motorModel', e.target.value)} className="w-full p-1 bg-transparent border rounded-md dark:border-gray-600">
                                                            {options.map(o => (
                                                                <option key={`${o.model}-${o.kw}`} value={o.model}>{o.model}, {o.kw}kW</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-2 text-right">
                                                <input type="number" value={item.qty} onChange={e => handleItemChange(item.id, 'qty', parseFloat(e.target.value))} className="w-20 p-1 text-right bg-transparent border rounded-md dark:border-gray-600" />
                                            </td>
                                            <td className="p-2 text-right font-medium">{fmtInt(item.unitPrice || 0)}</td>
                                            <td className="p-2 text-right font-medium">{fmtInt(item.qty * (item.unitPrice || 0))}</td>
                                        </tr>
                                    );
                                } else if (item.isStarter) {
                                    const ranges = Object.keys((PRICING_DATA.antiHeeling?.starters?.[item.starterType || 'DOL'] as Record<string, number>) || {});
                                    return (
                                        <tr key={item.id} className="border-b dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800/50">
                                            <td className="p-2">
                                                <div className="font-semibold">Starter</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 font-normal mt-1">
                                                    {(item.starterType || 'DOL') + (item.starterRange ? ` • ${item.starterRange}` : '')}
                                                </div>
                                            </td>
                                            <td className="p-2">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-xs text-gray-500 dark:text-gray-400">Type</label>
                                                        <select value={item.starterType || 'DOL'} onChange={e => handleStarterSelectionChange('starterType', e.target.value)} className="w-full p-1 bg-transparent border rounded-md dark:border-gray-600">
                                                            <option value="DOL">DOL</option>
                                                            <option value="YD">Y/D</option>
                                                            <option value="SOFT">SOFT</option>
                                                            <option value="VFD">VFD</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-500 dark:text-gray-400">kW Range</label>
                                                        <select value={item.starterRange || ranges[0] || ''} onChange={e => handleStarterSelectionChange('starterRange', e.target.value)} className="w-full p-1 bg-transparent border rounded-md dark:border-gray-600">
                                                            {ranges.map(r => (
                                                                <option key={r} value={r}>{r}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-2 text-right">
                                                <input type="number" value={item.qty} onChange={e => handleItemChange(item.id, 'qty', parseFloat(e.target.value))} className="w-20 p-1 text-right bg-transparent border rounded-md dark:border-gray-600" />
                                            </td>
                                            <td className="p-2 text-right font-medium">{fmtInt(item.unitPrice || 0)}</td>
                                            <td className="p-2 text-right font-medium">{fmtInt(item.qty * (item.unitPrice || 0))}</td>
                                        </tr>
                                    );
                                } else if (item.isValve) {
                                    const table = item.valveActing === 'Double-acting'
                                        ? (PRICING_DATA.antiHeeling?.valvesPneumatic?.doubleActing as Record<string, number>)
                                        : (PRICING_DATA.antiHeeling?.valvesPneumatic?.singleActing as Record<string, number>);
                                    const keys = Object.keys(table || {});
                                    return (
                                        <tr key={item.id} className="border-b dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800/50">
                                            <td className="p-2">
                                                <div className="font-semibold">Pneum. Valve</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 font-normal mt-1">
                                                    {(item.valveActing || 'Single-acting') + (item.valveModel ? ` • ${item.valveModel}` : '')}
                                                </div>
                                            </td>
                                            <td className="p-2">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-xs text-gray-500 dark:text-gray-400">Action</label>
                                                        <select value={item.valveActing || 'Single-acting'} onChange={e => handleValveSelectionChange(item.id, 'valveActing', e.target.value)} className="w-full p-1 bg-transparent border rounded-md dark:border-gray-600">
                                                            <option>Single-acting</option>
                                                            <option>Double-acting</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-500 dark:text-gray-400">Model</label>
                                                        <select value={item.valveModel || keys[0] || ''} onChange={e => handleValveSelectionChange(item.id, 'valveModel', e.target.value)} className="w-full p-1 bg-transparent border rounded-md dark:border-gray-600">
                                                            {keys.map(k => (
                                                                <option key={k} value={k}>{k}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-2 text-right">
                                                <input type="number" value={item.qty} onChange={e => handleItemChange(item.id, 'qty', parseFloat(e.target.value))} className="w-20 p-1 text-right bg-transparent border rounded-md dark:border-gray-600" />
                                            </td>
                                            <td className="p-2 text-right font-medium">{fmtInt(item.unitPrice || 0)}</td>
                                            <td className="p-2 text-right font-medium">{fmtInt(item.qty * (item.unitPrice || 0))}</td>
                                        </tr>
                                    );
                                } else if (item.isLevelSwitch) {
                                    const keys = Object.keys((PRICING_DATA.antiHeeling?.levelSwitches as Record<string, number>) || {});
                                    return (
                                        <React.Fragment key={item.id}>
                                            <tr className="border-b dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800/50">
                                                <td className="p-2">
                                                    <div className="font-semibold">Level Switch</div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 font-normal mt-1">
                                                        {item.levelSwitchModel || keys[0] || ''}
                                                    </div>
                                                </td>
                                                <td className="p-2">
                                                    <div>
                                                        <label className="text-xs text-gray-500 dark:text-gray-400">Model</label>
                                                        <select value={item.levelSwitchModel || keys[0] || ''} onChange={e => handleLevelSwitchChange(e.target.value)} className="w-full p-1 bg-transparent border rounded-md dark:border-gray-600">
                                                            {keys.map(k => (
                                                                <option key={k} value={k}>{k}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </td>
                                                <td className="p-2 text-right">
                                                    <input type="number" value={item.qty} onChange={e => handleItemChange(item.id, 'qty', parseFloat(e.target.value))} className="w-20 p-1 text-right bg-transparent border rounded-md dark:border-gray-600" />
                                                </td>
                                                <td className="p-2 text-right font-medium">{fmtInt(item.unitPrice || 0)}</td>
                                                <td className="p-2 text-right font-medium">{fmtInt(item.qty * (item.unitPrice || 0))}</td>
                                            </tr>
                                            {isAH && (
                                                <tr className="bg-gray-50 dark:bg-gray-800/40">
                                                    <td colSpan={5} className="p-2">
                                                        <div className="flex items-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowExtras(v => !v)}
                                                                className="px-3 py-1.5 text-sm font-medium rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                                                            >
                                                                {showExtras ? 'Hide Extras and Options' : 'Show Extras and Options'}
                                                            </button>
                                                            <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">
                                                                {extrasActiveCount} active • {fmtInt(extrasTotal)}
                                                            </span>
                                                        </div>
                                                        {showExtras && (
                                                            <div className="mt-3 space-y-2">
                                                                <div className="border rounded-md dark:border-gray-700">
                                                                    <button
                                                                        type="button"
                                                                        className="w-full text-left px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                                                                        onClick={() => setExtrasOpen(prev => ({ ...prev, control: !prev.control }))}
                                                                    >
                                                                        Control System ({extrasControl.filter(i => (i.qty || 0) > 0).length} active)
                                                                    </button>
                                                                    {extrasOpen.control && (
                                                                        <div className="divide-y dark:divide-gray-700">
                                                                            {extrasControl.map(i => (
                                                                                <div key={i.id} className="grid grid-cols-12 items-center px-3 py-2">
                                                                                    <div className="col-span-6 text-sm font-medium">{i.description}{i.sub ? ` — ${i.sub}` : ''}</div>
                                                                                    <div className="col-span-2 text-right">
                                                                                        <input type="number" value={i.qty} onChange={e => handleItemChange(i.id, 'qty', parseFloat(e.target.value))} className="w-20 p-1 text-right bg-transparent border rounded-md dark:border-gray-600" />
                                                                                    </div>
                                                                                    <div className="col-span-2 text-right">{fmtInt(i.unitPrice || 0)}</div>
                                                                                    <div className="col-span-2 text-right font-medium">{fmtInt(i.qty * (i.unitPrice || 0))}</div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="border rounded-md dark:border-gray-700">
                                                                    <button
                                                                        type="button"
                                                                        className="w-full text-left px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                                                                        onClick={() => setExtrasOpen(prev => ({ ...prev, valveExtras: !prev.valveExtras }))}
                                                                    >
                                                                        Valve Extras ({extrasValveExtras.filter(i => (i.qty || 0) > 0).length} active)
                                                                    </button>
                                                                    {extrasOpen.valveExtras && (
                                                                        <div className="divide-y dark:divide-gray-700">
                                                                            {extrasValveExtras.map(i => (
                                                                                <div key={i.id} className="grid grid-cols-12 items-center px-3 py-2">
                                                                                    <div className="col-span-6 text-sm font-medium">{i.description}{i.sub ? ` — ${i.sub}` : ''}</div>
                                                                                    <div className="col-span-2 text-right">
                                                                                        <input type="number" value={i.qty} onChange={e => handleItemChange(i.id, 'qty', parseFloat(e.target.value))} className="w-20 p-1 text-right bg-transparent border rounded-md dark:border-gray-600" />
                                                                                    </div>
                                                                                    <div className="col-span-2 text-right">{fmtInt(i.unitPrice || 0)}</div>
                                                                                    <div className="col-span-2 text-right font-medium">{fmtInt(i.qty * (i.unitPrice || 0))}</div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="border rounded-md dark:border-gray-700">
                                                                    <button
                                                                        type="button"
                                                                        className="w-full text-left px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                                                                        onClick={() => setExtrasOpen(prev => ({ ...prev, pump: !prev.pump }))}
                                                                    >
                                                                        Pump Additions ({extrasPump.filter(i => (i.qty || 0) > 0).length} active)
                                                                    </button>
                                                                    {extrasOpen.pump && (
                                                                        <div className="divide-y dark:divide-gray-700">
                                                                            {extrasPump.map(i => (
                                                                                <div key={i.id} className="grid grid-cols-12 items-center px-3 py-2">
                                                                                    <div className="col-span-6 text-sm font-medium">{i.description}{i.sub ? ` — ${i.sub}` : ''}</div>
                                                                                    <div className="col-span-2 text-right">
                                                                                        <input type="number" value={i.qty} onChange={e => handleItemChange(i.id, 'qty', parseFloat(e.target.value))} className="w-20 p-1 text-right bg-transparent border rounded-md dark:border-gray-600" />
                                                                                    </div>
                                                                                    <div className="col-span-2 text-right">{fmtInt(i.unitPrice || 0)}</div>
                                                                                    <div className="col-span-2 text-right font-medium">{fmtInt(i.qty * (i.unitPrice || 0))}</div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="border rounded-md dark:border-gray-700">
                                                                    <button
                                                                        type="button"
                                                                        className="w-full text-left px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                                                                        onClick={() => setExtrasOpen(prev => ({ ...prev, motor: !prev.motor }))}
                                                                    >
                                                                        Motor Additions ({extrasMotor.filter(i => (i.qty || 0) > 0).length} active)
                                                                    </button>
                                                                    {extrasOpen.motor && (
                                                                        <div className="divide-y dark:divide-gray-700">
                                                                            {extrasMotor.map(i => (
                                                                                <div key={i.id} className="grid grid-cols-12 items-center px-3 py-2">
                                                                                    <div className="col-span-6 text-sm font-medium">{i.description}{i.sub ? ` — ${i.sub}` : ''}</div>
                                                                                    <div className="col-span-2 text-right">
                                                                                        <input type="number" value={i.qty} onChange={e => handleItemChange(i.id, 'qty', parseFloat(e.target.value))} className="w-20 p-1 text-right bg-transparent border rounded-md dark:border-gray-600" />
                                                                                    </div>
                                                                                    <div className="col-span-2 text-right">{fmtInt(i.unitPrice || 0)}</div>
                                                                                    <div className="col-span-2 text-right font-medium">{fmtInt(i.qty * (i.unitPrice || 0))}</div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="border rounded-md dark:border-gray-700">
                                                                    <button
                                                                        type="button"
                                                                        className="w-full text-left px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                                                                        onClick={() => setExtrasOpen(prev => ({ ...prev, starter: !prev.starter }))}
                                                                    >
                                                                        Starter Additions ({extrasStarter.filter(i => (i.qty || 0) > 0).length} active)
                                                                    </button>
                                                                    {extrasOpen.starter && (
                                                                        <div className="divide-y dark:divide-gray-700">
                                                                            {extrasStarter.map(i => (
                                                                                <div key={i.id} className="grid grid-cols-12 items-center px-3 py-2">
                                                                                    <div className="col-span-6 text-sm font-medium">{i.description}{i.sub ? ` — ${i.sub}` : ''}</div>
                                                                                    <div className="col-span-2 text-right">
                                                                                        <input type="number" value={i.qty} onChange={e => handleItemChange(i.id, 'qty', parseFloat(e.target.value))} className="w-20 p-1 text-right bg-transparent border rounded-md dark:border-gray-600" />
                                                                                    </div>
                                                                                    <div className="col-span-2 text-right">{fmtInt(i.unitPrice || 0)}</div>
                                                                                    <div className="col-span-2 text-right font-medium">{fmtInt(i.qty * (i.unitPrice || 0))}</div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="border rounded-md dark:border-gray-700">
                                                                    <button
                                                                        type="button"
                                                                        className="w-full text-left px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                                                                        onClick={() => setExtrasOpen(prev => ({ ...prev, measurement: !prev.measurement }))}
                                                                    >
                                                                        Measurement ({extrasMeasurement.filter(i => (i.qty || 0) > 0).length} active)
                                                                    </button>
                                                                    {extrasOpen.measurement && (
                                                                        <div className="divide-y dark:divide-gray-700">
                                                                            {extrasMeasurement.map(i => (
                                                                                <div key={i.id} className="grid grid-cols-12 items-center px-3 py-2">
                                                                                    <div className="col-span-6 text-sm font-medium">{i.description}{i.sub ? ` — ${i.sub}` : ''}</div>
                                                                                    <div className="col-span-2 text-right">
                                                                                        <input type="number" value={i.qty} onChange={e => handleItemChange(i.id, 'qty', parseFloat(e.target.value))} className="w-20 p-1 text-right bg-transparent border rounded-md dark:border-gray-600" />
                                                                                    </div>
                                                                                    <div className="col-span-2 text-right">{fmtInt(i.unitPrice || 0)}</div>
                                                                                    <div className="col-span-2 text-right font-medium">{fmtInt(i.qty * (i.unitPrice || 0))}</div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="border rounded-md dark:border-gray-700">
                                                                    <button
                                                                        type="button"
                                                                        className="w-full text-left px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                                                                        onClick={() => setExtrasOpen(prev => ({ ...prev, other: !prev.other }))}
                                                                    >
                                                                        Other Equipment ({extrasOther.filter(i => (i.qty || 0) > 0).length} active)
                                                                    </button>
                                                                    {extrasOpen.other && (
                                                                        <div className="divide-y dark:divide-gray-700">
                                                                            {extrasOther.map(i => (
                                                                                <div key={i.id} className="grid grid-cols-12 items-center px-3 py-2">
                                                                                    <div className="col-span-6 text-sm font-medium">{i.description}{i.sub ? ` — ${i.sub}` : ''}</div>
                                                                                    <div className="col-span-2 text-right">
                                                                                        <input type="number" value={i.qty} onChange={e => handleItemChange(i.id, 'qty', parseFloat(e.target.value))} className="w-20 p-1 text-right bg-transparent border rounded-md dark:border-gray-600" />
                                                                                    </div>
                                                                                    <div className="col-span-2 text-right">{fmtInt(i.unitPrice || 0)}</div>
                                                                                    <div className="col-span-2 text-right font-medium">{fmtInt(i.qty * (i.unitPrice || 0))}</div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                } else if (item.isValveEH) {
                                    const singleKeys = Object.keys(((PRICING_DATA.antiHeeling?.valvesElectricPure?.singleActing as Record<string, number>) || {})).filter(k => !k.startsWith('DN200'));
                                    const doubleKeys = Object.keys(((PRICING_DATA.antiHeeling?.valvesElectricPure?.doubleActing as Record<string, number>) || {})).filter(k => !k.startsWith('DN200'));
                                    const keys = item.valveActing === 'Double-acting' ? doubleKeys : singleKeys;
                                    const sel = item.valveModel && keys.includes(item.valveModel) ? item.valveModel : (keys[0] || '');
                                    return (
                                        <tr key={item.id} className="border-b dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800/50">
                                            <td className="p-2">
                                                <div className="font-semibold">Electric Valve</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 font-normal mt-1">
                                                    {(item.valveActing || 'Single-acting') + (sel ? ` • ${sel}` : '')}
                                                </div>
                                            </td>
                                            <td className="p-2">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-xs text-gray-500 dark:text-gray-400">Action</label>
                                                        <select value={item.valveActing || 'Single-acting'} onChange={e => handleValveEHActingChange(item.id, e.target.value as any)} className="w-full p-1 bg-transparent border rounded-md dark:border-gray-600">
                                                            <option>Single-acting</option>
                                                            <option>Double-acting</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-500 dark:text-gray-400">Model</label>
                                                        <select value={sel} onChange={e => handleValveEHChange(item.id, e.target.value)} className="w-full p-1 bg-transparent border rounded-md dark:border-gray-600">
                                                            {keys.map(k => (
                                                                <option key={k} value={k}>{k}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-2 text-right">
                                                <input type="number" value={item.qty} onChange={e => handleItemChange(item.id, 'qty', parseFloat(e.target.value))} className="w-20 p-1 text-right bg-transparent border rounded-md dark:border-gray-600" />
                                            </td>
                                            <td className="p-2 text-right font-medium">{fmtInt(item.unitPrice || 0)}</td>
                                            <td className="p-2 text-right font-medium">{fmtInt(item.qty * (item.unitPrice || 0))}</td>
                                        </tr>
                                    );
                                } else if (item.isPumpAddition || item.isMotorAddition || item.isStarterAddition || item.isValveExtra || item.isMeasurement || item.isControlSystem || item.isOtherEquipment) {
                                    if (isAH && !showExtras) return null;
                                    return (
                                        <tr key={item.id} className="border-b dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800/50">
                                            <td className="p-2">
                                                <div className="font-semibold">{item.description}</div>
                                                {item.sub && (
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 font-normal mt-1">{item.sub}</div>
                                                )}
                                            </td>
                                            <td className="p-2"></td>
                                            <td className="p-2 text-right">
                                                <input type="number" value={item.qty} onChange={e => handleItemChange(item.id, 'qty', parseFloat(e.target.value))} className="w-20 p-1 text-right bg-transparent border rounded-md dark:border-gray-600" />
                                            </td>
                                            <td className="p-2 text-right font-medium">{fmtInt(item.unitPrice || 0)}</td>
                                            <td className="p-2 text-right font-medium">{fmtInt(item.qty * (item.unitPrice || 0))}</td>
                                        </tr>
                                    );
                                } else if (item.isClassCert) {
                                    if (isAH) return null; // Render in right panel for Anti-Heeling
                                    const societies = Object.keys((PRICING_DATA.antiHeeling?.classCertification as any) || {});
                                    const brs = Object.keys((((PRICING_DATA.antiHeeling?.classCertification as any) || {})[item.classSociety || societies[0]] || {}));
                                    return (
                                        <tr key={item.id} className="border-b dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800/50">
                                            <td className="p-2">
                                                <div className="font-semibold">Class Certification</div>
                                            </td>
                                            <td className="p-2">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-xs text-gray-500 dark:text-gray-400">Society</label>
                                                        <select value={item.classSociety || societies[0]} onChange={e => handleClassCertChange('society', e.target.value)} className="w-full p-1 bg-transparent border rounded-md dark:border-gray-600">
                                                            {societies.map(s => (
                                                                <option key={s} value={s}>{s}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-500 dark:text-gray-400">Power class</label>
                                                        <select value={item.classBracket || brs[0]} onChange={e => handleClassCertChange('bracket', e.target.value)} className="w-full p-1 bg-transparent border rounded-md dark:border-gray-600">
                                                            {brs.map(b => (
                                                                <option key={b} value={b}>{b}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-2 text-right">
                                                <input type="number" value={item.qty} onChange={e => handleItemChange(item.id, 'qty', parseFloat(e.target.value))} className="w-20 p-1 text-right bg-transparent border rounded-md dark:border-gray-600" />
                                            </td>
                                            <td className="p-2 text-right font-medium">{fmtInt(item.unitPrice || 0)}</td>
                                            <td className="p-2 text-right font-medium">{fmtInt(item.qty * (item.unitPrice || 0))}</td>
                                        </tr>
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
                                        <td className="p-2 text-right font-medium">{fmtInt(item.qty * item.unitPrice)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                    {/* Left column: Class/Startup/Currencies */}
                    <div className="space-y-2 self-end">
                        {isAH && (() => {
                            const classItem = lineItems.find(i => i.isClassCert);
                            const societies = Object.keys((PRICING_DATA.antiHeeling?.classCertification as any) || {});
                            const currentSociety = classItem?.classSociety || societies[0];
                            const brs = Object.keys((((PRICING_DATA.antiHeeling?.classCertification as any) || {})[currentSociety] || {}));
                            const amount = classItem ? (classItem.qty * (classItem.unitPrice || 0)) : 0;
                            return (
                                <div className="p-2 mb-2 bg-purple-50 dark:bg-purple-900/30 rounded-md">
                                    <div className="font-semibold mb-1">Class Certification</div>
                                    <div className="grid grid-cols-2 gap-2 items-end">
                                        <div>
                                            <label className="text-xs text-gray-500 dark:text-gray-400">Society</label>
                                            <select value={currentSociety} onChange={e => handleClassCertChange('society', e.target.value)} className="w-full p-1 bg-transparent border rounded-md dark:border-gray-600">
                                                {societies.map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 dark:text-gray-400">Power class</label>
                                            <select value={classItem?.classBracket || brs[0]} onChange={e => handleClassCertChange('bracket', e.target.value)} className="w-full p-1 bg-transparent border rounded-md dark:border-gray-600">
                                                {brs.map(b => (
                                                    <option key={b} value={b}>{b}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">Amount</span>
                                        <span className="font-semibold">{fmtInt(amount)}</span>
                                    </div>
                                </div>
                            );
                        })()}
                        {isAH && (
                            <div className="p-2 mb-2 bg-green-50 dark:bg-green-900/30 rounded-md">
                                <div className="font-semibold mb-1">Startup (Commissioning)</div>
                                <div className="flex items-center gap-2">
                                    <label className="text-xs text-gray-500 dark:text-gray-400">Location</label>
                                    <select value={startupLocation} onChange={e => setStartupLocation(e.target.value)} className="flex-1 p-1 bg-transparent border rounded-md dark:border-gray-600">
                                        {Object.keys((PRICING_DATA.antiHeeling?.startupLocations as any) || {}).map(k => (
                                            <option key={k} value={k}>{k}</option>
                                        ))}
                                    </select>
                                    <div className="ml-auto font-semibold">{fmtInt(startupCost)}</div>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Average total (3 days incl. travel etc.).</div>
                            </div>
                        )}
                        {false && isAH && null}
                        {isAH && (
                            <div className="p-2 mb-2 bg-green-50/60 dark:bg-green-900/20 rounded-md">
                                <div className="font-semibold mb-1">Extra Commissioning Days beyond 3</div>
                                <div className="flex items-center gap-2">
                                    <label className="text-xs text-gray-500 dark:text-gray-400">Days</label>
                                    <input type="number" min={0} step={1} value={extraCommissioningDays} onChange={e => setExtraCommissioningDays(parseInt(e.target.value || '0', 10))} className="w-24 p-1 text-right bg-transparent border rounded-md dark:border-gray-600" />
                                    <span className="text-xs text-gray-500 dark:text-gray-400">@ {fmtInt(EXTRA_DAY_RATE)} / day</span>
                                    <div className="ml-auto font-semibold">{fmtInt(extraCommissioningCost)}</div>
                                </div>
                            </div>
                        )}
                        {isAH && (
                            <div className="p-2 mb-2 bg-blue-50 dark:bg-blue-900/30 rounded-md">
                                <div className="font-semibold mb-1">Shipping (Commissioning Country)</div>
                                <div className="flex items-center gap-2">
                                    <label className="text-xs text-gray-500 dark:text-gray-400">Country/Region</label>
                                    <select value={shippingRegion} onChange={e => { setShippingRegion(e.target.value); setShippingAutoMap(false); }} className="flex-1 p-1 bg-transparent border rounded-md dark:border-gray-600">
                                        {Object.keys((PRICING_DATA.antiHeeling?.shippingByCommissioningRegion as any) || {}).map(k => (
                                            <option key={k} value={k}>{k}</option>
                                        ))}
                                    </select>
                                    <div className="ml-auto font-semibold">{fmtInt(shippingCost)}</div>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Standard system, 3-colli, 1–2 tonn.</div>
                            </div>
                        )}
                        {/* Currency blocks moved to the right column after Sales Price */}
                        <div className="p-2 mt-4 bg-yellow-100 dark:bg-yellow-900/50 rounded-md">
                            <label className="block font-semibold mb-1" htmlFor="estimate-comments">Comments</label>
                            <textarea
                                id="estimate-comments"
                                className="w-full p-2 text-sm bg-white dark:bg-gray-800 border border-yellow-300 dark:border-yellow-700 rounded-md min-h-[120px]"
                                value={comments}
                                onChange={e => setComments(e.target.value)}
                            />
                        </div>
                    </div>
                    {/* Right column: Summary and pricing */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span>Equipment Cost (VK)</span>
                            <span className="font-semibold text-right w-32">{fmtInt(equipmentCost)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>Adm.Cost (SKP)</span>
                            <div className="flex items-center">
                                <input type="number" value={adminPercent} onChange={e => setAdminPercent(parseFloat(e.target.value))} className="w-16 p-1 text-right bg-transparent border rounded-md dark:border-gray-600 mr-1" /> %
                                <span className="font-semibold text-right w-32">{fmtInt(adminAmount)}</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>Full Cost (VK+SKP)</span>
                            <span className="font-semibold text-right w-32">{fmtInt(vkxskp)}</span>
                        </div>
                        <div className="pt-2 border-t dark:border-gray-700" />
                        <div className="flex justify-between items-center">
                            <span>Startup (Commissioning)</span>
                            <span className="font-semibold text-right w-32">{fmtInt(startupCost)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>Startup extra days</span>
                            <span className="font-semibold text-right w-32">{fmtInt(extraCommissioningCost)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="italic">Sub-Total</span>
                            <span className="font-semibold text-right w-32">{fmtInt(subTotal)}</span>
                        </div>
                        <div className="pt-2 border-t dark:border-gray-700" />
                        <div className="flex justify-between items-center">
                            <span>Agent Provisjon</span>
                            <div className="flex items-center">
                                <input type="number" value={agentCommissionPercent} onChange={e => setAgentCommissionPercent(parseFloat(e.target.value))} className="w-16 p-1 text-right bg-transparent border rounded-md dark:border-gray-600 mr-1" /> %
                                <span className="font-semibold text-right w-32">{fmtInt(agentCommissionAmount)}</span>
                            </div>
                        </div>
                        <div className="pt-2 border-t dark:border-gray-700" />
                        <div className="flex justify-between items-center font-bold">
                            <span>Total Cost</span>
                            <span className="text-right w-32">{fmtInt(totalSelfCost)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>Mark-up</span>
                            <div className="flex items-center">
                                <input type="number" value={profitMarginPercent} onChange={e => setProfitMarginPercent(parseFloat(e.target.value))} className="w-16 p-1 text-right bg-transparent border rounded-md dark:border-gray-600 mr-1" /> %
                                <span className="font-semibold text-right w-32">{fmtInt(profitAmount)}</span>
                            </div>
                        </div>
                         <div className="flex justify-between items-center font-bold text-xl p-2 bg-blue-100 dark:bg-blue-900/50 rounded-md">
                            <span>Salgssum NOK</span>
                            <span className="text-right">{fmtCurrency(salesPriceNOK, 'nb-NO', 'NOK')}</span>
                        </div>
                        {/* Dynamic currency block after Sales Price */}
                        <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
                            {(() => {
                                const target = project.currency;
                                const label = (t: string) => `Sales Price (${t})`;
                                if (target === Currency.USD) {
                                    return (
                                        <div className="flex items-center">
                                            <span className="w-48">{label('USD')}</span>
                                            <span className="w-16">Rate:</span>
                                            <input type="number" step="0.01" value={usdRate} onChange={e => setUsdRate(parseFloat(e.target.value))} className="w-24 p-1 text-right bg-transparent border rounded-md dark:border-gray-600" />
                                            <div className="ml-4 p-2 font-bold text-right flex-1 bg-gray-200 dark:bg-gray-700 rounded-md">
                                                {fmtCurrency(salesPriceUSD, 'en-US', 'USD')}
                                            </div>
                                            <button onClick={() => handleUseThisPrice(salesPriceUSD, Currency.USD)} className="ml-2 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Use this Price</button>
                                        </div>
                                    );
                                } else if (target === Currency.EUR) {
                                    return (
                                        <div className="flex items-center">
                                            <span className="w-48">{label('EUR')}</span>
                                            <span className="w-16">Rate:</span>
                                            <input type="number" step="0.01" value={eurRate} onChange={e => setEurRate(parseFloat(e.target.value))} className="w-24 p-1 text-right bg-transparent border rounded-md dark:border-gray-600" />
                                            <div className="ml-4 p-2 font-bold text-right flex-1 bg-gray-200 dark:bg-gray-700 rounded-md">
                                               {fmtCurrency(salesPriceEUR, 'de-DE', 'EUR')}
                                            </div>
                                            <button onClick={() => handleUseThisPrice(salesPriceEUR, Currency.EUR)} className="ml-2 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Use this Price</button>
                                        </div>
                                    );
                                }
                                // Default NOK
                                return (
                                    <div className="flex items-center">
                                        <span className="w-48">{label('NOK')}</span>
                                        <div className="ml-4 p-2 font-bold text-right flex-1 bg-gray-200 dark:bg-gray-700 rounded-md">
                                            {fmtCurrency(salesPriceNOK, 'nb-NO', 'NOK')}
                                        </div>
                                        <button onClick={() => handleUseThisPrice(salesPriceNOK, Currency.NOK)} className="ml-2 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Use this Price</button>
                                    </div>
                                );
                            })()}
                        </div>
                        <div className="pt-2 border-t dark:border-gray-700" />
                        {/* Target & Bottom price */}
                        <div className="flex justify-between items-center mt-2">
                            <span>Target Price</span>
                            <span className="text-right w-32 flex items-center justify-end">
                                {project.currency === Currency.USD ? (
                                    <DollarIcon className="h-4 w-4 mr-1" />
                                ) : project.currency === Currency.EUR ? (
                                    <span className="mr-1">€</span>
                                ) : (
                                    <span className="mr-1">kr</span>
                                )}
                                <span>{targetPriceDisplay}</span>
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span>Mark-up Bottom Price</span>
                            <div className="flex items-center">
                                <input type="number" value={bottomPercent} onChange={e => setBottomPercent(parseFloat(e.target.value))} className="w-16 p-1 text-right bg-transparent border rounded-md dark:border-gray-600 mr-1" /> %
                                <span className="font-semibold text-right w-32">{fmtInt(bottomAmount)}</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center font-semibold">
                            <span>Bottom Price</span>
                            <span className="text-right w-32 flex items-center justify-end">
                                {project.currency === Currency.USD ? (
                                    <DollarIcon className="h-4 w-4 mr-1" />
                                ) : project.currency === Currency.EUR ? (
                                    <span className="mr-1">€</span>
                                ) : (
                                    <span className="mr-1">kr</span>
                                )}
                                <span>{bottomPriceDisplay}</span>
                            </span>
                        </div>
                    </div>
                </div>

            </div>
        </Modal>
    );
};