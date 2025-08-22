import React from 'react';
import type { Project, TeamMember } from '../types';
import { ProjectType } from '../types';
import { ProjectStage } from '../types';
import { PlusIcon } from './icons';

interface ProjectListSidebarProps {
    projects: Project[];
    teamMembers: TeamMember[];
    selectedProjectId: string | null;
    onSelectProject: (id: string) => void;
    onAddProjectClick: (type: ProjectType) => void;
}

const stageColors: { [key in ProjectStage]: string } = {
    [ProjectStage.LEAD]: 'bg-blue-500',
    [ProjectStage.OPP]: 'bg-indigo-500',
    [ProjectStage.RFQ]: 'bg-purple-500',
    [ProjectStage.QUOTE]: 'bg-yellow-500',
    [ProjectStage.PO]: 'bg-teal-500',
    [ProjectStage.ORDER_CONFIRMATION]: 'bg-cyan-500',
    [ProjectStage.WON]: 'bg-green-500',
    [ProjectStage.LOST]: 'bg-red-500',
    [ProjectStage.CANCELLED]: 'bg-gray-500',
};

export const ProjectListSidebar: React.FC<ProjectListSidebarProps> = ({ projects, teamMembers, selectedProjectId, onSelectProject, onAddProjectClick }) => {
    const [menuOpen, setMenuOpen] = React.useState(false);
    return (
        <aside className="w-[220px] bg-white dark:bg-gray-800 flex flex-col h-full overflow-hidden min-h-0 shadow-xl !border-l-0 border-none m-0 p-0">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-sm font-semibold">Project Pipeline</h2>
                <div className="relative">
                    <button
                        onClick={() => setMenuOpen(v => !v)}
                        className="p-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
                        aria-label="Add new project"
                        aria-haspopup="menu"
                        aria-expanded={menuOpen}
                    >
                        <PlusIcon className="w-4 h-4" />
                    </button>
                    {menuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50">
                            <button
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => { setMenuOpen(false); onAddProjectClick(ProjectType.FUEL_TRANSFER); }}
                            >
                                Fuel Transfer Project
                            </button>
                            <button
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => { setMenuOpen(false); onAddProjectClick(ProjectType.ANTI_HEELING); }}
                            >
                                Anti-Heeling Project
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <div className="overflow-y-auto">
                <ul>
                    {projects.map((project) => (
                        <li key={project.id}>
                            <button
                                onClick={() => onSelectProject(project.id)}
                                className={`w-full text-left p-3 ${
                                    selectedProjectId === project.id
                                        ? 'bg-blue-50 dark:bg-gray-700/50'
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                } focus:outline-none transition-colors duration-150`}
                            >
                                <div className="font-semibold text-gray-800 dark:text-gray-100 truncate flex items-center gap-2">
                                    <span className="truncate">{project.name}</span>
                                    {project.projectType && (
                                        <span
                                            title={project.projectType}
                                            className={`shrink-0 inline-flex items-center justify-center px-1.5 h-4 text-[10px] rounded-full border ${
                                                project.projectType === ProjectType.ANTI_HEELING
                                                    ? 'bg-teal-600/10 text-teal-700 dark:text-teal-300 border-teal-600/30'
                                                    : 'bg-amber-600/10 text-amber-700 dark:text-amber-300 border-amber-600/30'
                                            }`}
                                        >
                                            {project.projectType === ProjectType.ANTI_HEELING ? 'AH' : 'FT'}
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    Value: ${project.value.toLocaleString()}
                                </div>
                                <div className="flex items-center mt-1">
                                    <span className={`w-2 h-2 rounded-full ${stageColors[project.stage]} mr-2`}></span>
                                    <span className="text-xs font-medium">{project.stage}</span>
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </aside>
    );
};
