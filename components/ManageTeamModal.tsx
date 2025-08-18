import React, { useState } from 'react';
import type { TeamMember } from '../types';
import { Modal } from './Modal';
import { TrashIcon, PlusIcon } from './icons';

interface ManageTeamModalProps {
    onClose: () => void;
    teamMembers: TeamMember[];
    onAddTeamMember: (member: Omit<TeamMember, 'id'>) => void;
    onDeleteTeamMember: (memberId: string) => void;
}

export const ManageTeamModal: React.FC<ManageTeamModalProps> = ({ onClose, teamMembers, onAddTeamMember, onDeleteTeamMember }) => {
    const [newName, setNewName] = useState('');
    const [newInitials, setNewInitials] = useState('');
    const [newJobTitle, setNewJobTitle] = useState('');

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newInitials || !newJobTitle) {
            alert('Please provide a name, initials, and job title.');
            return;
        }
        onAddTeamMember({ name: newName, initials: newInitials.toUpperCase(), jobTitle: newJobTitle });
        setNewName('');
        setNewInitials('');
        setNewJobTitle('');
    };

    const inputClass = "w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none";
    const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

    return (
        <Modal isOpen={true} onClose={onClose} title="Manage Team Members">
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold mb-2">Add New Member</h3>
                    <form onSubmit={handleAddSubmit} className="flex items-end space-x-4">
                        <div className="flex-1">
                            <label htmlFor="new-member-name" className={labelClass}>Name</label>
                            <input
                                id="new-member-name"
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className={inputClass}
                                placeholder="e.g. John Doe"
                                required
                            />
                        </div>
                        <div className="flex-1">
                            <label htmlFor="new-member-title" className={labelClass}>Job Title</label>
                            <input
                                id="new-member-title"
                                type="text"
                                value={newJobTitle}
                                onChange={(e) => setNewJobTitle(e.target.value)}
                                className={inputClass}
                                placeholder="e.g. Sales Manager"
                                required
                            />
                        </div>
                        <div className="w-24">
                            <label htmlFor="new-member-initials" className={labelClass}>Initials</label>
                            <input
                                id="new-member-initials"
                                type="text"
                                value={newInitials}
                                onChange={(e) => setNewInitials(e.target.value)}
                                className={inputClass}
                                placeholder="e.g. JD"
                                maxLength={2}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center"
                            aria-label="Add team member"
                        >
                           <PlusIcon className="w-5 h-5 mr-1" /> Add
                        </button>
                    </form>
                </div>

                <div>
                    <h3 className="text-lg font-semibold mb-2">Current Team ({teamMembers.length})</h3>
                    <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {teamMembers.map((member) => (
                            <li key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                        {member.initials}
                                    </div>
                                    <div>
                                        <p className="font-medium">{member.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{member.jobTitle}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onDeleteTeamMember(member.id)}
                                    className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600"
                                    aria-label={`Delete ${member.name}`}
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
                 <div className="flex justify-end pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Close</button>
                </div>
            </div>
        </Modal>
    );
};