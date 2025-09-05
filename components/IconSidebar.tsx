import React from 'react';
import { SearchIcon, LayoutGridIcon, NewspaperIcon, FileIcon, UsersIcon, TrendingUpIcon } from './icons';
import { ContactIcon } from './ContactIcon';

type View = 'dashboard' | 'pipeline' | 'companyInfo' | 'files' | 'intel' | 'leads' | 'contacts';

interface IconSidebarProps {
    activeView: View;
    onNavigate: (view: View) => void;
}

const NavItem: React.FC<{
    icon: React.ReactNode;
    isActive?: boolean;
    onClick: () => void;
    ariaLabel?: string;
    title?: string;
}> = ({ icon, isActive, onClick, ariaLabel, title }) => {
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center w-full p-2 focus:outline-none transition-colors duration-200 relative group ${
                isActive
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
            aria-label={ariaLabel || title || 'icon'}
            title={title}
        >
            {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-blue-500 rounded-r-full"></div>}
            {icon}
            {/* Tooltip on hover */}
            {title && (
                <span className="pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-black/80 text-white text-[10px] opacity-0 group-hover:opacity-100 whitespace-nowrap">
                    {title}
                </span>
            )}
        </button>
    );
};


export const IconSidebar: React.FC<IconSidebarProps> = ({ activeView, onNavigate }) => {
    return (
    <nav className="fixed top-0 left-0 bottom-0 flex flex-col items-center w-10 bg-gray-800 text-white z-20 pt-2 border-none">
            <button
                onClick={() => onNavigate('dashboard')}
                className={`flex flex-col items-center justify-center w-full p-2 focus:outline-none transition-colors duration-200 group ${activeView === 'dashboard' ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
                aria-label="Dashboard"
                title="Dashboard"
            >
                <img src="/framo-logo.png" alt="Framo Logo" className="w-6 h-6 rounded-lg object-cover" />
            </button>
            <div className="flex flex-col items-center w-full mt-2 space-y-1">
                <NavItem
                    icon={<SearchIcon className="w-5 h-5" />}
                    isActive={false}
                    onClick={() => alert('Global search coming soon!')}
                    ariaLabel="Search"
                    title="Search"
                />
                <NavItem
                    icon={<LayoutGridIcon className="w-5 h-5" />}
                    isActive={activeView === 'pipeline'}
                    onClick={() => onNavigate('pipeline')}
                    ariaLabel="Pipeline"
                    title="Pipeline"
                />
                <NavItem
                    icon={<UsersIcon className="w-5 h-5" />}
                    isActive={activeView === 'companyInfo'}
                    onClick={() => onNavigate('companyInfo')}
                    ariaLabel="Companies"
                    title="Companies"
                />
                <NavItem
                    icon={<ContactIcon className="w-5 h-5" />}
                    isActive={activeView === 'contacts'}
                    onClick={() => onNavigate('contacts')}
                    ariaLabel="Contacts"
                    title="Contacts"
                />
                <NavItem
                    icon={<NewspaperIcon className="w-5 h-5" />}
                    isActive={activeView === 'intel'}
                    onClick={() => onNavigate('intel')}
                    ariaLabel="Market Intelligence"
                    title="Market Intelligence"
                />
                <NavItem
                    icon={<TrendingUpIcon className="w-5 h-5" />}
                    isActive={activeView === 'leads'}
                    onClick={() => onNavigate('leads')}
                    ariaLabel="Leads"
                    title="Leads"
                />
                <NavItem
                    icon={<FileIcon className="w-5 h-5" />}
                    isActive={activeView === 'files'}
                    onClick={() => onNavigate('files')}
                    ariaLabel="Files"
                    title="Files"
                />
            </div>
        </nav>
    );
};