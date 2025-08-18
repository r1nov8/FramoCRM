
import React from 'react';
import type { Company } from '../types';
import { ShipyardIcon, VesselOwnerIcon, DesignCompanyIcon } from './icons';

interface CompanyCardProps {
    company: Company;
}

const companyIcons: { [key in Company['type']]: React.ReactNode } = {
    'Shipyard': <ShipyardIcon className="w-5 h-5 text-gray-400" />,
    'Vessel Owner': <VesselOwnerIcon className="w-5 h-5 text-gray-400" />,
    'Design Company': <DesignCompanyIcon className="w-5 h-5 text-gray-400" />,
};

export const CompanyCard: React.FC<CompanyCardProps> = ({ company }) => {
    return (
        <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-700/50 dark:border-gray-600">
            <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                    {companyIcons[company.type]}
                </div>
                <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{company.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{company.type}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{company.location}</p>
                </div>
            </div>
        </div>
    );
};
