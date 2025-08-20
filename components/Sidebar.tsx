import React from 'react';
import type { Project, TeamMember } from '../types';
import { ProjectStage } from '../types';
import { PlusIcon } from './icons';

interface ProjectListSidebarProps {
    projects: Project[];
    teamMembers: TeamMember[];
    selectedProjectId: string | null;
    onSelectProject: (id: string) => void;
    onAddProjectClick: () => void;
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
    return (
        <aside className="w-[220px] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-sm font-semibold">Project Pipeline</h2>
                <button
                    onClick={onAddProjectClick}
                    className="p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
                    aria-label="Add new project"
                >
                    <PlusIcon className="w-5 h-5" />
                </button>
            </div>
            <div className="overflow-y-auto">
                <ul>
                    {projects.map((project) => (
                        <li key={project.id}>
                            <button
                                onClick={() => onSelectProject(project.id)}
                                className={`w-full text-left p-3 border-l-4 ${
                                    selectedProjectId === project.id
                                        ? 'bg-blue-50 dark:bg-gray-700/50 border-blue-600'
                                        : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                                } focus:outline-none transition-colors duration-150`}
                            >
                                <div className="font-semibold text-gray-800 dark:text-gray-100 truncate">{project.name}</div>
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
