import React, { useEffect } from 'react';
import { ProjectListSidebar } from './Sidebar';
import { ProjectDetails } from './DealDetails';
import type { Project, Company, Contact, TeamMember } from '../types';
import { ProjectType } from '../types';

interface ProjectPipelineViewProps {
    projects: Project[];
    companies: Company[];
    contacts: Contact[];
    teamMembers: TeamMember[];
    selectedProjectId: string | null;
    onSelectProject: (id: string) => void;
    onAddProjectClick: (type: ProjectType) => void;
    onEditProject: (project: Project) => void;
    selectedProject: Project | null;
    onUploadFiles: (projectId: string, files: FileList) => void;
    onDeleteFile: (projectId: string, fileId: string) => void;
    onOpenHPUSizing: () => void;
    onOpenEstimateCalculator: () => void;
    isActive?: boolean;
    onOpenActivity: (projectId: string) => void;
}

export const ProjectPipelineView: React.FC<ProjectPipelineViewProps> = ({
    projects,
    companies,
    contacts,
    teamMembers,
    selectedProjectId,
    onSelectProject,
    onAddProjectClick,
    onEditProject,
    selectedProject,
    onUploadFiles,
    onDeleteFile,
    onOpenHPUSizing,
    onOpenEstimateCalculator,
    isActive = false,
    onOpenActivity,
}) => {
    // Import UI removed as part of rollback
    // Ensure a project is selected so details/tools are visible
    useEffect(() => {
        if (!selectedProjectId && projects && projects.length > 0) {
            onSelectProject(projects[0].id);
        }
    }, [selectedProjectId, projects]);

    return (
        <div className="flex flex-1 h-full min-h-0 items-stretch">
            <ProjectListSidebar
                projects={projects}
                teamMembers={teamMembers}
                selectedProjectId={selectedProjectId}
                onSelectProject={onSelectProject}
                onAddProjectClick={onAddProjectClick}
            />
            <main className="flex-1 px-6 pb-6 pt-0 overflow-y-auto">
                {selectedProject ? (
                    <ProjectDetails
                        project={selectedProject}
                        companies={companies}
                        contacts={contacts}
                        teamMembers={teamMembers}
                        onEditProject={() => onEditProject(selectedProject)}
                        onUploadFiles={onUploadFiles}
                        onDeleteFile={onDeleteFile}
                        onOpenHPUSizing={onOpenHPUSizing}
                        onOpenEstimateCalculator={onOpenEstimateCalculator}
                        isActive={isActive}
                        onOpenActivity={onOpenActivity}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <h2 className="text-2xl font-semibold text-gray-500">No Project Selected</h2>
                            <p className="mt-2 text-gray-400">Please select a project from the list or add a new one.</p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};