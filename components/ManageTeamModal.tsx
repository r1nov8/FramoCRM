

import React, { useState } from 'react';
import type { TeamMember } from '../types';
import { Modal } from './Modal';
import { TrashIcon, PlusIcon } from './icons';

interface ManageTeamModalProps {
    onClose: () => void;
    teamMembers: TeamMember[];
    onAddTeamMember: (member: Omit<TeamMember, 'id'>) => void;
    onDeleteTeamMember: (memberId: string) => void;
    onUpdateTeamMember: (member: TeamMember) => void;
}


export const ManageTeamModal: React.FC<ManageTeamModalProps> = ({ onClose, teamMembers, onAddTeamMember, onDeleteTeamMember, onUpdateTeamMember }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editFirstName, setEditFirstName] = useState('');
    const [editLastName, setEditLastName] = useState('');
    const [editJobTitle, setEditJobTitle] = useState('');

    const [newFirstName, setNewFirstName] = useState('');
    const [newLastName, setNewLastName] = useState('');
    const [newJobTitle, setNewJobTitle] = useState('');

    const startEdit = (member: TeamMember) => {
        setEditingId(member.id);
        setEditFirstName(member.first_name);
        setEditLastName(member.last_name);
        setEditJobTitle(member.jobTitle);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditFirstName('');
        setEditLastName('');
        setEditJobTitle('');
    };

    const saveEdit = (member: TeamMember) => {
        if (!editFirstName.trim() || !editLastName.trim() || !editJobTitle.trim()) return;
        onUpdateTeamMember({ ...member, first_name: editFirstName, last_name: editLastName, jobTitle: editJobTitle });
        setEditingId(null);
        setEditFirstName('');
        setEditLastName('');
        setEditJobTitle('');
    };

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFirstName.trim() || !newLastName.trim() || !newJobTitle.trim()) {
            alert('Please provide first name, last name, and job title.');
            return;
        }
        onAddTeamMember({ first_name: newFirstName, last_name: newLastName, initials: '', jobTitle: newJobTitle });
        setNewFirstName('');
        setNewLastName('');
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
                            <label htmlFor="new-member-first-name" className={labelClass}>First Name</label>
                            <input
                                id="new-member-first-name"
                                type="text"
                                value={newFirstName}
                                onChange={(e) => setNewFirstName(e.target.value)}
                                className={inputClass}
                                placeholder="e.g. John"
                                required
                            />
                        </div>
                        <div className="flex-1">
                            <label htmlFor="new-member-last-name" className={labelClass}>Last Name</label>
                            <input
                                id="new-member-last-name"
                                type="text"
                                value={newLastName}
                                onChange={(e) => setNewLastName(e.target.value)}
                                className={inputClass}
                                placeholder="e.g. Doe"
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
                                {editingId === member.id ? (
                                    <div className="flex-1 flex flex-col md:flex-row md:items-center gap-2">
                                        <input
                                            type="text"
                                            className="w-full md:w-32 p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            value={editFirstName}
                                            onChange={e => setEditFirstName(e.target.value)}
                                            placeholder="First name"
                                        />
                                        <input
                                            type="text"
                                            className="w-full md:w-32 p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            value={editLastName}
                                            onChange={e => setEditLastName(e.target.value)}
                                            placeholder="Last name"
                                        />
                                        <input
                                            type="text"
                                            className="w-full md:w-32 p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            value={editJobTitle}
                                            onChange={e => setEditJobTitle(e.target.value)}
                                            placeholder="Job title"
                                        />
                                        <button onClick={() => saveEdit(member)} className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Save</button>
                                        <button onClick={cancelEdit} className="px-3 py-1 text-sm font-medium text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 ml-2">Cancel</button>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col md:flex-row md:items-center gap-2">
                                        <span className="font-medium text-base">{member.first_name} {member.last_name}</span>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">{member.jobTitle}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 ml-2">
                                    <button
                                        onClick={() => startEdit(member)}
                                        className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600"
                                        aria-label={`Edit ${member.first_name} ${member.last_name}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13h3l8-8a2.828 2.828 0 00-4-4l-8 8v3zm0 0v3h3" /></svg>
                                    </button>
                                    <button
                                        onClick={() => onDeleteTeamMember(member.id)}
                                        className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600"
                                        aria-label={`Delete ${member.first_name} ${member.last_name}`}
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
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