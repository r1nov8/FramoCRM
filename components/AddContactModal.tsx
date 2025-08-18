
import React, { useState } from 'react';
import type { Contact, Company } from '../types';
import { Modal } from './Modal';

interface AddContactModalProps {
    onClose: () => void;
    onAddContact: (contact: Omit<Contact, 'id'>) => void;
    companies: Company[];
}

export const AddContactModal: React.FC<AddContactModalProps> = ({ onClose, onAddContact, companies }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [companyId, setCompanyId] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !companyId) {
            alert('Please fill in Name and select a Company.');
            return;
        }
        onAddContact({ name, email, phone, companyId });
    };

    const inputClass = "w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none";
    const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

    return (
        <Modal isOpen={true} onClose={onClose} title="Add New Contact">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="contactName" className={labelClass}>Full Name</label>
                    <input type="text" id="contactName" value={name} onChange={e => setName(e.target.value)} className={inputClass} required />
                </div>

                <div>
                    <label htmlFor="contactCompany" className={labelClass}>Company</label>
                    <select id="contactCompany" value={companyId} onChange={e => setCompanyId(e.target.value)} className={inputClass} required>
                        <option value="">Select a company</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="email" className={labelClass}>Email</label>
                        <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
                    </div>
                     <div>
                        <label htmlFor="phone" className={labelClass}>Phone</label>
                        <input type="tel" id="phone" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} />
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button type="button" onClick={onClose} className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cancel</button>
                    <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Add Contact</button>
                </div>
            </form>
        </Modal>
    );
};
