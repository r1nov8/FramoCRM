import React from 'react';
import { UsersIcon } from './icons';

interface HeaderProps {
    title: string;
    onManageTeamClick: () => void;
    rightContent?: React.ReactNode;
}


export const Header: React.FC<HeaderProps> = ({ title, rightContent }) => {
    return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-12 px-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm w-full">
            <h1 className="text-lg font-bold text-gray-800 dark:text-white ml-12">
                {title}
            </h1>
            <div className="flex items-center">{rightContent}</div>
        </header>
    );
};
