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
import { HPUSizingModal } from './components/HPUSizingModal';
import { EstimateCalculatorModal } from './components/EstimateCalculatorModal';
import type { Project, Company, Contact, Currency } from './types';
import { CompanyType } from './types';
import { useData } from './context/DataContext';

type View = 'dashboard' | 'pipeline';

const App: React.FC = () => {
    // All data and data handlers are now pulled from context
    const {
        projects,
        companies,
        contacts,
        teamMembers,
        selectedProjectId,
        setSelectedProjectId,
        handleAddProject,
        handleUpdateProject,
        handleAddCompany,
        handleAddContact,
        handleAddTeamMember,
        handleDeleteTeamMember,
        handleUploadFiles,
        handleDeleteFile,
        handleUpdateProjectPrice
    } = useData();

    // UI state for modals and views remains in the App component
    const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
    const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
    const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
    const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);
    const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
    const [isManageTeamModalOpen, setIsManageTeamModalOpen] = useState(false);
    const [isHPUSizingModalOpen, setIsHPUSizingModalOpen] = useState(false);
    const [isEstimateCalculatorOpen, setIsEstimateCalculatorOpen] = useState(false);
    
    const [companyTypeForModal, setCompanyTypeForModal] = useState<CompanyType | undefined>(undefined);
    const [activeView, setActiveView] = useState<View>('dashboard');

    const selectedProject = useMemo(() => {
        return projects.find(project => project.id === selectedProjectId) || null;
    }, [projects, selectedProjectId]);
    
    // Wrapper functions to also handle modal closing
    const handleAddProjectAndCloseModal = (newProject: Omit<Project, 'id'>) => {
        handleAddProject(newProject);
        setIsAddProjectModalOpen(false);
    };

    const handleUpdateProjectAndCloseModal = (updatedProject: Project) => {
        handleUpdateProject(updatedProject);
        setIsEditProjectModalOpen(false);
        setProjectToEdit(null);
    };
    
    const handleAddCompanyAndCloseModal = (newCompany: Omit<Company, 'id'>) => {
        handleAddCompany(newCompany);
        setIsAddCompanyModalOpen(false);
    };

    const handleAddContactAndCloseModal = (newContact: Omit<Contact, 'id'>) => {
        handleAddContact(newContact);
        setIsAddContactModalOpen(false);
    };
    
    const handleOpenEditModal = (project: Project) => {
        setProjectToEdit(project);
        setIsEditProjectModalOpen(true);
    };
    
    const handleOpenAddCompanyModal = (type: CompanyType) => {
        setCompanyTypeForModal(type);
        setIsAddCompanyModalOpen(true);
    };

    const handleUpdateProjectPriceAndCloseModal = (price: number, currency: Currency) => {
        if (selectedProjectId) {
            handleUpdateProjectPrice(selectedProjectId, price, currency);
            setIsEstimateCalculatorOpen(false);
        }
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
                        onOpenHPUSizing={() => setIsHPUSizingModalOpen(true)}
                        onOpenEstimateCalculator={() => setIsEstimateCalculatorOpen(true)}
                    />
                )}
            </div>

            {isAddProjectModalOpen && (
                <AddProjectModal
                    onClose={() => setIsAddProjectModalOpen(false)}
                    onAddProject={handleAddProjectAndCloseModal}
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
                    onUpdateProject={handleUpdateProjectAndCloseModal}
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
                    onAddCompany={handleAddCompanyAndCloseModal}
                    initialType={companyTypeForModal}
                />
            )}
            {isAddContactModalOpen && (
                <AddContactModal
                    onClose={() => setIsAddContactModalOpen(false)}
                    onAddContact={handleAddContactAndCloseModal}
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
            {isHPUSizingModalOpen && (
                <HPUSizingModal
                    onClose={() => setIsHPUSizingModalOpen(false)}
                />
            )}
            {isEstimateCalculatorOpen && selectedProject && (
                <EstimateCalculatorModal
                    project={selectedProject}
                    companies={companies}
                    teamMembers={teamMembers}
                    onClose={() => setIsEstimateCalculatorOpen(false)}
                    onUpdateProjectPrice={handleUpdateProjectPriceAndCloseModal}
                />
            )}
        </div>
    );
};

export default App;