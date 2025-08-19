import React from 'react';
import { UsersIcon } from './icons';

interface HeaderProps {
    title: string;
    onManageTeamClick: () => void;
    rightContent?: React.ReactNode;
}


export const Header: React.FC<HeaderProps> = ({ title, rightContent }) => {
    return (
        <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm flex-shrink-0">
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                {title}
            </h1>
            {rightContent}
        </header>
    );
};
