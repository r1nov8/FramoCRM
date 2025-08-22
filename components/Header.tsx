import React from 'react';
import { BUILD_INFO } from '../buildInfo';
import { API_URL } from '../hooks/useCrmData';
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
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => {
                        const next = prompt('Set API base URL', API_URL) || '';
                        if (next && /^https?:\/\//i.test(next)) {
                            try { localStorage.setItem('api_url_override', next); } catch {}
                            // Soft reload to take effect everywhere
                            window.location.reload();
                        }
                    }}
                    title={`API: ${API_URL}\nClick to change`}
                    className="hidden md:inline-flex items-center px-2 py-0.5 rounded bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900"
                >
                    api
                </button>
                <span title={`Commit ${BUILD_INFO.commit} — built ${new Date(BUILD_INFO.builtAt).toLocaleString()}`} className="hidden sm:inline-flex items-center px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs border border-gray-200 dark:border-gray-600">
                    build {BUILD_INFO.commitShort}
                </span>
                {rightContent}
            </div>
        </header>
    );
};
