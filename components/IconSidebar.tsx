import React from 'react';
import { SearchIcon, LayoutGridIcon } from './icons';

type View = 'dashboard' | 'pipeline';

interface IconSidebarProps {
    activeView: View;
    onNavigate: (view: View) => void;
}

const NavItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center w-full p-3 space-y-1 focus:outline-none transition-colors duration-200 relative group ${
                isActive
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
            aria-label={label}
        >
            {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-blue-500 rounded-r-full"></div>}
            {icon}
            <span className="text-xs font-medium">{label}</span>
            <span className="absolute left-full ml-4 w-auto p-2 min-w-max rounded-md shadow-md text-white bg-gray-800 text-xs font-bold transition-all duration-100 scale-0 origin-left group-hover:scale-100 z-30">{label}</span>
        </button>
    );
};

export const IconSidebar: React.FC<IconSidebarProps> = ({ activeView, onNavigate }) => {
    return (
        <nav className="flex flex-col items-center w-20 bg-gray-800 text-white shadow-lg z-20 flex-shrink-0">
            <button onClick={() => onNavigate('dashboard')} className="flex items-center justify-center w-20 h-20 border-b-2 border-gray-700 hover:bg-gray-700/50 transition-colors duration-200 p-0 m-0">
                <img src="/framo-logo.png" alt="Framo Logo" className="w-12 h-12 rounded-2xl object-cover" />
            </button>
            <div className="flex flex-col items-center w-full mt-4 space-y-2">
                <NavItem
                    label="Search"
                    icon={<SearchIcon className="w-6 h-6" />}
                    isActive={false} // Search is not a view yet, just a button
                    onClick={() => alert('Global search coming soon!')}
                />
                <NavItem
                    label="Pipeline"
                    icon={<LayoutGridIcon className="w-6 h-6" />}
                    isActive={activeView === 'pipeline'}
                    onClick={() => onNavigate('pipeline')}
                />
            </div>
        </nav>
    );
};