import React, { useRef } from 'react';
import type { Project, Company, Contact, TeamMember, ProjectFile } from '../types';
import { ProjectStage, Currency } from '../types';
import { CompanyCard } from './CompanyCard';
import { ContactCard } from './ContactCard';
import { ProductInfo } from './ProductInfo';
import { PencilIcon, DollarIcon, PercentIcon, UploadIcon, DownloadIcon, TrashIcon, FileIcon, FileDocIcon, FilePdfIcon, CalculatorIcon } from './icons';

interface ProjectDetailsProps {
    project: Project;
    companies: Company[];
    contacts: Contact[];
    teamMembers: TeamMember[];
    onEditProject: () => void;
    onUploadFiles: (projectId: string, files: FileList) => void;
    onDeleteFile: (projectId: string, fileId: string) => void;
    onOpenHPUCalculator: () => void;
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

export const ProjectDetails: React.FC<ProjectDetailsProps> = ({ project, companies, contacts, teamMembers, onEditProject, onUploadFiles, onDeleteFile, onOpenHPUCalculator }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const findCompany = (id: string) => companies.find(c => c.id === id);
    const findContact = (id: string) => contacts.find(c => c.id === id);
    const salesRep = teamMembers.find(tm => tm.id === project.salesRepId);

    const shipyard = findCompany(project.shipyardId);
    const vesselOwner = project.vesselOwnerId ? findCompany(project.vesselOwnerId) : undefined;
    const designCompany = project.designCompanyId ? findCompany(project.designCompanyId) : undefined;
    const primaryContact = findContact(project.primaryContactId);

    const currentStageIndex = stageProgress[project.stage];
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
    const showHPUCalculator = [ProjectStage.RFQ, ProjectStage.QUOTE, ProjectStage.PO, ProjectStage.ORDER_CONFIRMATION, ProjectStage.WON].includes(project.stage);


    const handleFileUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            onUploadFiles(project.id, event.target.files);
        }
    };

    const handleFileDownload = (file: ProjectFile) => {
        const link = document.createElement('a');
        link.href = `data:${file.type};base64,${file.content}`;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                            <span>Opp. No: <span className="font-semibold text-gray-700 dark:text-gray-300">{project.opportunityNumber}</span></span>
                             {project.orderNumber && <span className="border-l border-gray-300 dark:border-gray-600 pl-4">Order No: <span className="font-semibold text-gray-700 dark:text-gray-300">{project.orderNumber}</span></span>}
                        </div>
                        <p className="text-lg text-gray-600 dark:text-gray-300 mt-2">Value: <span className="font-semibold text-blue-600 dark:text-blue-400">{currencySymbol}{project.value.toLocaleString()} {project.currency}</span></p>
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
                        </div>
                        {salesRep && (
                            <div className="flex items-center justify-end mt-2">
                                <span className="text-sm font-medium text-gray-600 dark:text-gray-300 mr-2">{salesRep.name}</span>
                                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                    {salesRep.initials}
                                </div>
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                     <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-4">Products & Specifications</h2>
                        <div className="space-y-4">
                        {project.products.map((product, index) => (
                            <ProductInfo key={index} product={product} />
                        ))}
                        </div>
                    </div>
                    
                    {showHPUCalculator && (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                            <div className="flex justify-between items-center">
                                 <h2 className="text-xl font-semibold flex items-center"><CalculatorIcon className="w-6 h-6 mr-2 text-gray-500" /> HPU Sizing Calculator</h2>
                                 <button 
                                    onClick={onOpenHPUCalculator}
                                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                                >
                                    Open Calculator
                                </button>
                            </div>
                        </div>
                    )}

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
                                <span className="text-gray-600 dark:text-gray-400">Number of Vessels</span>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">{project.numberOfVessels}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Pumps per Vessel</span>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">{project.pumpsPerVessel}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Price per Vessel</span>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">{currencySymbol}{project.pricePerVessel.toLocaleString()}</span>
                            </div>
                             {showGrossMargin && (
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
                         <h2 className="text-xl font-semibold mb-4">Involved Companies</h2>
                         <div className="space-y-4">
                            {shipyard && <CompanyCard company={shipyard} />}
                            {vesselOwner && <CompanyCard company={vesselOwner} />}
                            {designCompany && <CompanyCard company={designCompany} />}
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};