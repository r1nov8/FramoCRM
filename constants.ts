import type { Company, Contact, Project, TeamMember } from './types';
import { CompanyType, ProjectStage, ProductType, Currency, VesselSizeUnit, FuelType } from './types';

export const INITIAL_COMPANIES: Company[] = [
    { id: 'comp-1', name: 'Hyundai Heavy Industries', type: CompanyType.SHIPYARD, location: 'Ulsan, South Korea' },
    { id: 'comp-2', name: 'Maersk Line', type: CompanyType.VESSEL_OWNER, location: 'Copenhagen, Denmark' },
    { id: 'comp-3', name: 'Deltamarin Ltd', type: CompanyType.DESIGN_COMPANY, location: 'Turku, Finland' },
    { id: 'comp-4', name: 'Samsung Heavy Industries', type: CompanyType.SHIPYARD, location: 'Geoje, South Korea' },
    { id: 'comp-5', name: 'CMA CGM', type: CompanyType.VESSEL_OWNER, location: 'Marseille, France' },
];

export const INITIAL_CONTACTS: Contact[] = [
    { id: 'cont-1', name: 'Jin-ho Park', email: 'j.park@hhi.co.kr', phone: '+82 52-202-2114', companyId: 'comp-1' },
    { id: 'cont-2', name: 'Søren Skou', email: 'soren.skou@maersk.com', phone: '+45 3363 3363', companyId: 'comp-2' },
    { id: 'cont-3', name: 'Kristian Knaapi', email: 'k.knaapi@deltamarin.com', phone: '+358 2 433 6300', companyId: 'comp-3' },
    { id: 'cont-4', name: 'Min-jun Kim', email: 'mj.kim@shi.samsung.co.kr', phone: '+82 55-630-3114', companyId: 'comp-4' },
    { id: 'cont-5', name: 'Rodolphe Saadé', email: 'r.saade@cma-cgm.com', phone: '+33 4 88 91 90 00', companyId: 'comp-5' },
];

export const INITIAL_TEAM_MEMBERS: TeamMember[] = [
    { id: 'team-1', name: 'Stian Tørresen', initials: 'ST', jobTitle: 'Sales Manager' },
    { id: 'team-2', name: 'John Doe', initials: 'JD', jobTitle: 'Sales Representative' },
    { id: 'team-3', name: 'Jane Smith', initials: 'JS', jobTitle: 'Sales Engineer' },
];


export const INITIAL_PROJECTS: Project[] = [
    {
        id: 'proj-1',
        name: 'HHI New Build Methanol Feed',
        opportunityNumber: 'OPP-2024-001',
        stage: ProjectStage.QUOTE,
        value: 1250000,
        currency: Currency.USD,
        grossMarginPercent: 22.5,
        closingDate: '2024-12-15',
        salesRepId: 'team-1',
        shipyardId: 'comp-1',
        vesselOwnerId: 'comp-2',
        designCompanyId: 'comp-3',
        primaryContactId: 'cont-1',
        products: [
            { type: ProductType.SD_100_METHANOL, quantity: 4, capacity: 150, head: 120 },
        ],
        notes: 'Initial quotation sent. Waiting for feedback on technical specifications. Follow up next week.',
        numberOfVessels: 5,
        pumpsPerVessel: 2,
        pricePerVessel: 250000,
        vesselSize: 65000,
        vesselSizeUnit: VesselSizeUnit.DWT,
        fuelType: FuelType.METHANOL,
        files: [],
    },
    {
        id: 'proj-2',
        name: 'SHI LNF Fuel Transfer System',
        opportunityNumber: 'OPP-2024-002',
        orderNumber: 'PO-2025-A58',
        stage: ProjectStage.ORDER_CONFIRMATION,
        value: 980000,
        currency: Currency.EUR,
        hedgeCurrency: Currency.USD,
        grossMarginPercent: 18,
        closingDate: '2025-01-30',
        salesRepId: 'team-2',
        shipyardId: 'comp-4',
        vesselOwnerId: 'comp-5',
        primaryContactId: 'cont-4',
        products: [
            { type: ProductType.SLG_25, quantity: 2, capacity: 200, head: 150 },
        ],
        notes: 'Purchase order received. Awaiting order confirmation from our side.',
        numberOfVessels: 2,
        pumpsPerVessel: 4,
        pricePerVessel: 490000,
        vesselSize: 15000,
        vesselSizeUnit: VesselSizeUnit.TEU,
        fuelType: FuelType.LNG,
        files: [],
    },
    {
        id: 'proj-3',
        name: 'Maersk Retrofit Project',
        opportunityNumber: 'OPP-2024-003',
        stage: ProjectStage.LEAD,
        value: 0, // To be estimated
        currency: Currency.NOK,
        closingDate: '2025-03-10',
        salesRepId: 'team-3',
        shipyardId: 'comp-1',
        vesselOwnerId: 'comp-2',
        primaryContactId: 'cont-2',
        products: [
            { type: ProductType.SD_100_METHANOL, quantity: 2, capacity: 120, head: 100 },
        ],
        notes: 'Early stage lead from a marketing campaign. Initial contact made.',
        numberOfVessels: 10,
        pumpsPerVessel: 1,
        pricePerVessel: undefined,
        vesselSize: 18000,
        vesselSizeUnit: VesselSizeUnit.TEU,
        fuelType: FuelType.NH3,
        files: [],
    },
];