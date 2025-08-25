export enum CompanyType {
    SHIPYARD = 'Shipyard',
    VESSEL_OWNER = 'Vessel Owner',
    DESIGN_COMPANY = 'Design Company',
}

export enum ProjectStage {
    LEAD = 'Lead',
    OPP = 'OPP',
    RFQ = 'Request for Quote-RFQ',
    QUOTE = 'Quote',
    PO = 'Purchase Order-PO',
    ORDER_CONFIRMATION = 'Order Confirmation',
    WON = 'Won',
    LOST = 'Lost',
    CANCELLED = 'Cancelled',
}

export enum ProductType {
    // Cargo Pumps
    SD_100 = 'SD-100',
    SD_125 = 'SD-125',
    SD_150 = 'SD-150',
    SD_200 = 'SD-200',
    SD_250 = 'SD-250',
    SD_250L = 'SD-250L',
    SD_300L = 'SD-300L',
    SD_350 = 'SD-350',

    // Portable Pumps
    TK_80 = 'TK-80',
    TK_100 = 'TK-100',
    TK_150 = 'TK-150',

    // Ballast Pumps
    SB_125 = 'SB-125',
    SB_200 = 'SB-200',
    SB_300 = 'SB-300',
    SB_400 = 'SB-400',
    SB_600 = 'SB-600',

    // Other/Legacy
    SD_100_METHANOL = 'SD-100 (Methanol)',
    SLG_25 = 'SLG-25 (LNF)',
    DUMMY_SD100 = 'Dummy SD100',
    HYDRAULIC_MODULE = 'Hydraulic Module',
}

export enum ProjectType {
    FUEL_TRANSFER = 'Fuel Transfer',
    ANTI_HEELING = 'Anti-Heeling',
}

export enum Currency {
    USD = 'USD',
    EUR = 'EUR',
    NOK = 'NOK',
    JPY = 'JPY',
    KRW = 'KRW',
}

export enum VesselSizeUnit {
    DWT = 'DWT',
    TEU = 'TEU',
}

export enum FuelType {
    METHANOL = 'Methanol',
    LNG = 'LNG',
    NH3 = 'NH3',
}

export interface Company {
    id: string;
    name: string;
    type: CompanyType;
    location: string;
}

export interface Contact {
    id: string;
    name: string;
    email: string;
    phone: string;
    companyId: string;
}

export interface Product {
    type: ProductType;
    quantity: number;
    capacity: number; // m3/h
    head: number; // mlc (meter liquid column)
}

export interface TeamMember {
    id: string;
    first_name: string;
    last_name: string;
    initials: string;
    jobTitle: string;
}

export interface ProjectFile {
    id: string;
    name: string;
    type: string; // MIME type
    size: number; // in bytes
    content: string; // base64 encoded content
}

export type TaskStatus = 'open' | 'wip' | 'blocked' | 'done';

export interface Task {
    id: string;
    projectId: string;
    title: string;
    status: TaskStatus;
    dueDate?: string | null; // ISO date (YYYY-MM-DD)
    assignedTo?: string | null; // team member id
    notes?: string | null;
    priority?: 1 | 2 | 3; // 1=high, 2=normal, 3=low
    createdAt?: string;
    updatedAt?: string;
}

export type ActivityType = 'note' | 'status_change' | 'system';

export interface Activity {
    id: string;
    projectId: string;
    type: ActivityType;
    content: string;
    createdBy?: string | null; // team member id or username
    createdByName?: string | null;
    createdAt: string; // ISO timestamp
}

export interface Project {
    id:string;
    name: string;
    projectType?: ProjectType;
    opportunityNumber: string;
    orderNumber?: string;
    stage: ProjectStage;
    value: number;
    currency: Currency;
    hedgeCurrency?: Currency;
    grossMarginPercent?: number;
    closingDate: string;
    salesRepId?: string;
    shipyardId: string;
    vesselOwnerId?: string;
    designCompanyId?: string;
    primaryContactId?: string;
    products: Product[];
    notes: string;
    numberOfVessels: number;
    pumpsPerVessel: number;
    pricePerVessel?: number;
    selfCostPerVessel?: number;
    vesselSize?: number;
    vesselSizeUnit?: VesselSizeUnit;
    fuelType: FuelType;
    files: ProjectFile[];
}