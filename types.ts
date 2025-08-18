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
    SD_100 = 'SD-100 (Methanol)',
    SLG_25 = 'SLG-25 (LNF)',
}

export enum Currency {
    USD = 'USD',
    EUR = 'EUR',
    NOK = 'NOK',
    JPY = 'JPY',
    KRW = 'KRW',
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
    name: string;
    initials: string;
}

export interface ProjectFile {
    id: string;
    name: string;
    type: string; // MIME type
    size: number; // in bytes
    content: string; // base64 encoded content
}

export interface Project {
    id:string;
    name: string;
    opportunityNumber: string;
    orderNumber?: string;
    stage: ProjectStage;
    value: number; // This will be calculated: numberOfVessels * pricePerVessel
    currency: Currency;
    hedgeCurrency?: Currency;
    grossMarginPercent?: number;
    closingDate: string;
    salesRepId?: string;
    shipyardId: string;
    vesselOwnerId?: string;
    designCompanyId?: string;
    primaryContactId: string;
    products: Product[];
    notes: string;
    numberOfVessels: number;
    pumpsPerVessel: number;
    pricePerVessel: number;
    files: ProjectFile[];
}
