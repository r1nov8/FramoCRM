import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { IconSidebar } from './components/IconSidebar';
import { Dashboard } from './components/Dashboard';
import { ProjectPipelineView } from './components/ProjectPipelineView';
import { AddProjectModal } from './components/AddDealModal';
import { EditProjectModal } from './components/EditProjectModal';
import { AddCompanyModal } from './components/AddCompanyModal';
import { AddContactModal } from './components/AddContactModal';
import { ManageTeamModal } from './components/ManageTeamModal';
import { HPUCalculatorModal } from './components/HPUCalculatorModal';
import { EstimateCalculatorModal } from './components/EstimateCalculatorModal';
import type { Project, Company, Contact, TeamMember, ProjectFile } from './types';
import { CompanyType, ProjectStage } from './types';
import { INITIAL_PROJECTS, INITIAL_COMPANIES, INITIAL_CONTACTS, INITIAL_TEAM_MEMBERS } from './constants';

type View = 'dashboard' | 'pipeline';

const App: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
    const [companies, setCompanies] = useState<Company[]>(INITIAL_COMPANIES);
    const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>(INITIAL_TEAM_MEMBERS);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projects[0]?.id || null);
    
    const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
    const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
    const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
    const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);
    const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
    const [isManageTeamModalOpen, setIsManageTeamModalOpen] = useState(false);
    const [isHPUCalculatorOpen, setIsHPUCalculatorOpen] = useState(false);
    const [isEstimateCalculatorOpen, setIsEstimateCalculatorOpen] = useState(false);
    
    const [companyTypeForModal, setCompanyTypeForModal] = useState<CompanyType | undefined>(undefined);
    const [activeView, setActiveView] = useState<View>('dashboard');

    const selectedProject = useMemo(() => {
        return projects.find(project => project.id === selectedProjectId) || null;
    }, [projects, selectedProjectId]);

    const handleAddProject = (newProject: Omit<Project, 'id'>) => {
        const projectWithId: Project = {
            ...newProject,
            id: `proj-${Date.now()}`,
            files: [],
        };
        setProjects(prevProjects => [projectWithId, ...prevProjects]);
        setIsAddProjectModalOpen(false);
        setSelectedProjectId(projectWithId.id);
    };

    const handleOpenEditModal = (project: Project) => {
        setProjectToEdit(project);
        setIsEditProjectModalOpen(true);
    };

    const handleUpdateProject = (updatedProject: Project) => {
        setProjects(prevProjects =>
            prevProjects.map(p => (p.id === updatedProject.id ? updatedProject : p))
        );
        setIsEditProjectModalOpen(false);
        setProjectToEdit(null);
    };
    
    const handleOpenAddCompanyModal = (type: CompanyType) => {
        setCompanyTypeForModal(type);
        setIsAddCompanyModalOpen(true);
    };

    const handleAddCompany = (newCompany: Omit<Company, 'id'>) => {
        const companyWithId: Company = {
            ...newCompany,
            id: `comp-${Date.now()}`
        };
        setCompanies(prev => [...prev, companyWithId]);
        setIsAddCompanyModalOpen(false);
    };

    const handleAddContact = (newContact: Omit<Contact, 'id'>) => {
        const contactWithId: Contact = {
            ...newContact,
            id: `cont-${Date.now()}`
        };
        setContacts(prev => [...prev, contactWithId]);
        setIsAddContactModalOpen(false);
    };

    const handleAddTeamMember = (newMember: Omit<TeamMember, 'id'>) => {
        const memberWithId: TeamMember = {
            ...newMember,
            id: `team-${Date.now()}`
        };
        setTeamMembers(prev => [...prev, memberWithId]);
    };

    const handleDeleteTeamMember = (memberId: string) => {
        // Unassign projects from the deleted member
        setProjects(prevProjects =>
            prevProjects.map(p => {
                if (p.salesRepId === memberId) {
                    return { ...p, salesRepId: undefined };
                }
                return p;
            })
        );
        // Remove the team member
        setTeamMembers(prev => prev.filter(m => m.id !== memberId));
    };

    const handleUploadFiles = (projectId: string, files: FileList) => {
        const filePromises = Array.from(files).map(file => {
            return new Promise<ProjectFile>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const projectFile: ProjectFile = {
                        id: `file-${Date.now()}-${Math.random()}`,
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        content: (event.target?.result as string).split(',')[1], // Get base64 content
                    };
                    resolve(projectFile);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        });

        Promise.all(filePromises).then(newFiles => {
            setProjects(prevProjects =>
                prevProjects.map(p => {
                    if (p.id === projectId) {
                        return { ...p, files: [...p.files, ...newFiles] };
                    }
                    return p;
                })
            );
        });
    };

    const handleDeleteFile = (projectId: string, fileId: string) => {
        setProjects(prevProjects =>
            prevProjects.map(p => {
                if (p.id === projectId) {
                    return { ...p, files: p.files.filter(f => f.id !== fileId) };
                }
                return p;
            })
        );
    };

    const pageTitle = useMemo(() => {
        if (activeView === 'pipeline') return 'Project Pipeline';
        return 'Dashboard';
    }, [activeView]);

    return (
        <div className="flex h-screen font-sans bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            <IconSidebar activeView={activeView} onNavigate={setActiveView} />
            <div className="flex flex-col flex-1 overflow-hidden">
                <Header title={pageTitle} onManageTeamClick={() => setIsManageTeamModalOpen(true)} />
                
                {activeView === 'dashboard' && (
                    <main className="flex-1 overflow-y-auto p-6">
                        <Dashboard />
                    </main>
                )}

                {activeView === 'pipeline' && (
                    <ProjectPipelineView
                        projects={projects}
                        companies={companies}
                        contacts={contacts}
                        teamMembers={teamMembers}
                        selectedProjectId={selectedProjectId}
                        onSelectProject={setSelectedProjectId}
                        onAddProjectClick={() => setIsAddProjectModalOpen(true)}
                        onEditProject={handleOpenEditModal}
                        selectedProject={selectedProject}
                        onUploadFiles={handleUploadFiles}
                        onDeleteFile={handleDeleteFile}
                        onOpenHPUCalculator={() => setIsHPUCalculatorOpen(true)}
                    />
                )}
            </div>

            {isAddProjectModalOpen && (
                <AddProjectModal
                    onClose={() => setIsAddProjectModalOpen(false)}
                    onAddProject={handleAddProject}
                    companies={companies}
                    contacts={contacts}
                    teamMembers={teamMembers}
                    onAddCompanyClick={handleOpenAddCompanyModal}
                    onAddContactClick={() => setIsAddContactModalOpen(true)}
                />
            )}
            {isEditProjectModalOpen && projectToEdit && (
                <EditProjectModal
                    project={projectToEdit}
                    onClose={() => {
                        setIsEditProjectModalOpen(false);
                        setProjectToEdit(null);
                    }}
                    onUpdateProject={handleUpdateProject}
                    companies={companies}
                    contacts={contacts}
                    teamMembers={teamMembers}
                    onAddCompanyClick={handleOpenAddCompanyModal}
                    onAddContactClick={() => setIsAddContactModalOpen(true)}
                />
            )}
            {isAddCompanyModalOpen && (
                <AddCompanyModal
                    onClose={() => setIsAddCompanyModalOpen(false)}
                    onAddCompany={handleAddCompany}
                    initialType={companyTypeForModal}
                />
            )}
            {isAddContactModalOpen && (
                <AddContactModal
                    onClose={() => setIsAddContactModalOpen(false)}
                    onAddContact={handleAddContact}
                    companies={companies}
                />
            )}
            {isManageTeamModalOpen && (
                <ManageTeamModal
                    onClose={() => setIsManageTeamModalOpen(false)}
                    teamMembers={teamMembers}
                    onAddTeamMember={handleAddTeamMember}
                    onDeleteTeamMember={handleDeleteTeamMember}
                />
            )}
            {isHPUCalculatorOpen && (
                <HPUCalculatorModal
                    onClose={() => {
                        setIsHPUCalculatorOpen(false);
                        if (selectedProject?.stage === ProjectStage.QUOTE) {
                            setIsEstimateCalculatorOpen(true);
                        }
                    }}
                />
            )}
            {isEstimateCalculatorOpen && (
                <EstimateCalculatorModal
                    onClose={() => setIsEstimateCalculatorOpen(false)}
                />
            )}
        </div>
    );
};

export default App;
