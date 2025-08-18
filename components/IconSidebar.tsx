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
            <button onClick={() => onNavigate('dashboard')} className="flex items-center justify-center w-full h-20 border-b border-gray-700 hover:bg-gray-700/50 transition-colors duration-200">
                <img src="data:image/png;base64,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" alt="Framo Logo" className="h-10" />
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