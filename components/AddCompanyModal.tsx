import React, { useState } from 'react';
import type { Company } from '../types';
import { CompanyType } from '../types';
import { Modal } from './Modal';
import { useData } from '../context/DataContext';

interface AddCompanyModalProps {
    onClose: () => void;
    onAddCompany: (company: Omit<Company, 'id'>) => void; // kept for backward compat; not used in full flow
    initialType?: CompanyType;
}

// Full company form replicating Company Info headers
export const AddCompanyModal: React.FC<AddCompanyModalProps> = ({ onClose, onAddCompany, initialType }) => {
    const { handleCreateCompanySimple, handleUpdateCompany, reloadCompanies } = useData() as any;

    // Core fields
    const [Company, setCompany] = useState('');
    const [Vessels, setVessels] = useState('');
    const [Nationality, setNationality] = useState(''); // Company Nationality/Region
    const [ActivityL1, setActivityL1] = useState<string>(initialType || ''); // Company Primary Activity - Level 1
    const [City, setCity] = useState(''); // Company City
    const [Size, setSize] = useState(''); // Company Size
    const [MainVesselType, setMainVesselType] = useState(''); // Company Main Vessel Type
    const [Website, setWebsite] = useState(''); // Company Website
    const [Email, setEmail] = useState(''); // Company Email Address
    const [GroupCompany, setGroupCompany] = useState(''); // Group Company
    const [TelNumber, setTelNumber] = useState(''); // Company Tel Number

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!Company.trim()) {
                alert('Please enter Company name');
                return;
            }
            // Create minimal, then update remaining CSV-aligned fields
            const created = await handleCreateCompanySimple({
                name: Company.trim(),
                type: ActivityL1 || undefined,
                location: Nationality || undefined,
                address: City || undefined,
                website: Website || undefined
            });
            const id = created.id;
            const remaining: any = {};
            if (Vessels !== '') remaining['Vessels'] = Vessels;
            if (Size) remaining['Company Size'] = Size;
            if (MainVesselType) remaining['Company Main Vessel Type'] = MainVesselType;
            if (Email) remaining['Company Email Address'] = Email;
            if (GroupCompany) remaining['Group Company'] = GroupCompany;
            if (TelNumber) remaining['Company Tel Number'] = TelNumber;
            // Ensure Activity/Nationality/City/Website also persisted even if not accepted by POST
            if (ActivityL1) remaining['Company Primary Activity - Level 1'] = ActivityL1;
            if (Nationality) remaining['Company Nationality/Region'] = Nationality;
            if (City) remaining['Company City'] = City;
            if (Website) remaining['Company Website'] = Website;
            if (Object.keys(remaining).length) {
                await handleUpdateCompany({ id, ...remaining });
            }
            await reloadCompanies?.();
            onClose();
        } catch (err: any) {
            console.error('[AddCompanyModal] Create full company failed:', err);
            const msg = String(err?.message || err || 'Failed to add company');
            if (msg.includes('409') || /exists/i.test(msg)) {
                alert('Company already exists. Please search and select it instead.');
            } else {
                alert('Failed to add company. See console for details.');
            }
        }
    };

    const inputClass = "w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none";
    const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

    return (
        <Modal isOpen={true} onClose={onClose} title="Add New Company">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Company</label>
                        <input value={Company} onChange={e => setCompany(e.target.value)} className={inputClass} required />
                    </div>
                    <div>
                        <label className={labelClass}>Vessels</label>
                        <input value={Vessels} onChange={e => setVessels(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Company Nationality/Region</label>
                        <input value={Nationality} onChange={e => setNationality(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Company Primary Activity - Level 1</label>
                        <input value={ActivityL1} onChange={e => setActivityL1(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Company City</label>
                        <input value={City} onChange={e => setCity(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Company Size</label>
                        <input value={Size} onChange={e => setSize(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Company Main Vessel Type</label>
                        <input value={MainVesselType} onChange={e => setMainVesselType(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Company Website</label>
                        <input value={Website} onChange={e => setWebsite(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Company Email Address</label>
                        <input type="email" value={Email} onChange={e => setEmail(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Group Company</label>
                        <input value={GroupCompany} onChange={e => setGroupCompany(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Company Tel Number</label>
                        <input value={TelNumber} onChange={e => setTelNumber(e.target.value)} className={inputClass} />
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button type="button" onClick={onClose} className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cancel</button>
                    <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Add Company</button>
                </div>
            </form>
        </Modal>
    );
};
