import React from 'react';
import { UsersIcon } from './icons';

interface HeaderProps {
    title: string;
    onManageTeamClick: () => void;
    rightContent?: React.ReactNode;
}


export const Header: React.FC<HeaderProps> = ({ title, rightContent }) => {
    return (
        <header className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm w-full">
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                {title}
            </h1>
            <div className="flex items-center">{rightContent}</div>
        </header>
    );
};
