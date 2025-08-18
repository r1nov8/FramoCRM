
import React, { useState } from 'react';
import type { Company } from '../types';
import { CompanyType } from '../types';
import { Modal } from './Modal';

interface AddCompanyModalProps {
    onClose: () => void;
    onAddCompany: (company: Omit<Company, 'id'>) => void;
    initialType?: CompanyType;
}

export const AddCompanyModal: React.FC<AddCompanyModalProps> = ({ onClose, onAddCompany, initialType }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<CompanyType>(initialType || CompanyType.SHIPYARD);
    const [location, setLocation] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !type || !location) {
            alert('Please fill in all fields.');
            return;
        }
        onAddCompany({ name, type, location });
    };

    const inputClass = "w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none";
    const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

    return (
        <Modal isOpen={true} onClose={onClose} title="Add New Company">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="companyName" className={labelClass}>Company Name</label>
                    <input type="text" id="companyName" value={name} onChange={e => setName(e.target.value)} className={inputClass} required />
                </div>

                <div>
                    <label htmlFor="companyType" className={labelClass}>Company Type</label>
                    <select id="companyType" value={type} onChange={e => setType(e.target.value as CompanyType)} className={inputClass}>
                        {Object.values(CompanyType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                <div>
                    <label htmlFor="location" className={labelClass}>Location</label>
                    <input type="text" id="location" value={location} onChange={e => setLocation(e.target.value)} className={inputClass} required />
                </div>

                <div className="flex justify-end pt-4">
                    <button type="button" onClick={onClose} className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cancel</button>
                    <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Add Company</button>
                </div>
            </form>
        </Modal>
    );
};
