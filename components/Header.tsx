import React from 'react';
import { UsersIcon } from './icons';

interface HeaderProps {
    title: string;
    onManageTeamClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onManageTeamClick }) => {
    return (
        <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm flex-shrink-0">
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                {title}
            </h1>
            <div className="flex items-center space-x-4">
                 <button 
                    onClick={onManageTeamClick}
                    className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
                    aria-label="Manage team"
                >
                    <UsersIcon className="w-5 h-5" />
                    <span>Manage Team</span>
                </button>
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    ST
                </div>
            </div>
        </header>
    );
};
