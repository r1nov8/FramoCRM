
import React from 'react';
import type { Contact, Company } from '../types';
import { MailIcon, PhoneIcon } from './icons';

interface ContactCardProps {
    contact: Contact;
    company?: Company;
}

export const ContactCard: React.FC<ContactCardProps> = ({ contact, company }) => {
    return (
        <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-700/50 dark:border-gray-600">
            <p className="font-semibold text-gray-800 dark:text-gray-100">{contact.name}</p>
            {company && <p className="text-sm text-gray-500 dark:text-gray-400">{company.name}</p>}
            <div className="mt-2 space-y-1 text-sm">
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
                    <MailIcon className="w-4 h-4 text-gray-400" />
                    <a href={`mailto:${contact.email}`} className="hover:text-blue-600 dark:hover:text-blue-400">{contact.email}</a>
                </div>
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
                    <PhoneIcon className="w-4 h-4 text-gray-400" />
                    <span>{contact.phone}</span>
                </div>
            </div>
        </div>
    );
};
