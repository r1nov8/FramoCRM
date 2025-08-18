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
    const getSalesRep = (id: string) => teamMembers.find(tm => tm.id === id);

    return (
        <aside className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-lg font-semibold">Project Pipeline ({projects.length})</h2>
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
                    {projects.map((project) => {
                        const salesRep = getSalesRep(project.salesRepId);
                        return (
                            <li key={project.id}>
                                <button
                                    onClick={() => onSelectProject(project.id)}
                                    className={`w-full text-left p-4 border-l-4 ${
                                        selectedProjectId === project.id
                                            ? 'bg-blue-50 dark:bg-gray-700/50 border-blue-600'
                                            : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                                    } focus:outline-none transition-colors duration-150`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="font-semibold text-gray-800 dark:text-gray-100">{project.name}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                Value: ${project.value.toLocaleString()}
                                            </div>
                                        </div>
                                        {salesRep && (
                                            <div className="ml-2 w-8 h-8 flex-shrink-0 bg-blue-200 dark:bg-blue-900 rounded-full flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300" title={salesRep.name}>
                                                {salesRep.initials}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center mt-2">
                                        <span className={`w-3 h-3 rounded-full ${stageColors[project.stage]} mr-2`}></span>
                                        <span className="text-xs font-medium">{project.stage}</span>
                                    </div>
                                </button>
                            </li>
                        )
                    })}
                </ul>
            </div>
        </aside>
    );
};
