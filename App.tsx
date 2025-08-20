    // Add missing handler for AddContactModal
    const handleAddContactAndCloseModal = (newContact: Omit<Contact, 'id'>) => {
        handleAddContact(newContact);
        setIsAddContactModalOpen(false);
    };
import React, { useState, useMemo } from 'react';
import { AuthForm } from './components/AuthForm';
import { Header } from './components/Header';
import { ExitDoorIcon, UsersIcon } from './components/icons';
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

    const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
    const [user, setUser] = useState<{ name: string; initials: string } | null>(() => {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
    });
    const handleAuthSuccess = (jwt: string, userInfo: { name: string; initials: string }) => {
        setToken(jwt);
        setUser(userInfo);
        localStorage.setItem('token', jwt);
        localStorage.setItem('user', JSON.stringify(userInfo));
    };

    if (!token || !user) {
        return <AuthForm onAuthSuccess={handleAuthSuccess} />;
    }

    // Logout handler
    const handleLogout = () => {
        setToken(null);
        localStorage.removeItem('token');
    };

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
    const [activeView, setActiveView] = useState<View>('dashboard');
    const [companyTypeForModal, setCompanyTypeForModal] = useState<CompanyType | null>(null);

    const selectedProject = projects.find(p => p.id === selectedProjectId) || null;

    const handleAddProjectAndCloseModal = (newProject: Omit<Project, 'id'>) => {
        handleAddProject(newProject);
        setIsAddProjectModalOpen(false);
    };

    const handleUpdateProjectAndCloseModal = (updatedProject: Project) => {
        handleUpdateProject(updatedProject);
        setIsEditProjectModalOpen(false);
    };

    const handleAddCompanyAndCloseModal = (newCompany: Omit<Company, 'id'>) => {
        handleAddCompany(newCompany);
        setIsAddCompanyModalOpen(false);
    };


    // Fix: Add missing handleOpenEditModal
    const handleOpenEditModal = (project: Project) => {
        setProjectToEdit(project);
        setIsEditProjectModalOpen(true);
    };


    const pageTitle = useMemo(() => {
        if (activeView === 'pipeline') return 'Project Pipeline';
        return 'Dashboard';
    }, [activeView]);

    return (
        <div className="flex h-screen font-sans bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            <IconSidebar activeView={activeView} onNavigate={setActiveView} />
            <div className="flex flex-col flex-1 overflow-hidden pt-20"> {/* pt-20 for header height */}
                <Header
                    title={pageTitle}
                    rightContent={
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setIsManageTeamModalOpen(true)}
                                className="flex items-center space-x-2 p-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
                                aria-label="Manage team"
                            >
                                <UsersIcon className="w-5 h-5" />
                            </button>
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                                {user?.initials || 'ST'}
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-2 rounded-md bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800"
                                title="Logout"
                            >
                                <ExitDoorIcon className="w-6 h-6" />
                            </button>
                        </div>
                    }
                />
                {activeView === 'dashboard' && (
                    <main className="flex-1 overflow-y-auto p-0">
                        <Dashboard userFirstName={teamMembers[0]?.first_name || ''} />
                    </main>
                )}
                {/* Slide-in Project Pipeline View */}
                <div
                    className={`fixed top-16 left-16 right-0 bottom-0 z-30 transition-transform duration-500 ease-in-out bg-gray-100 dark:bg-gray-900 shadow-xl border-l border-gray-200 dark:border-gray-700 ${
                        activeView === 'pipeline' ? 'translate-x-0' : '-translate-x-full pointer-events-none opacity-0'
                    } flex`}
                    style={{ height: 'calc(100vh - 4rem)' }}
                >
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
                </div>
            </div>
            {isAddProjectModalOpen && (
                <AddProjectModal
                    onAddProject={handleAddProjectAndCloseModal}
                    onClose={() => setIsAddProjectModalOpen(false)}
                />
            )}
            {isEditProjectModalOpen && projectToEdit && (
                <EditProjectModal
                    project={projectToEdit}
                    onUpdateProject={handleUpdateProjectAndCloseModal}
                    onClose={() => setIsEditProjectModalOpen(false)}
                    companies={companies}
                    contacts={contacts}
                    teamMembers={teamMembers}
                    onAddCompanyClick={(type) => {
                        setCompanyTypeForModal(type);
                        setIsAddCompanyModalOpen(true);
                    }}
                    onAddContactClick={() => setIsAddContactModalOpen(true)}
                />
            )}
            {isAddCompanyModalOpen && (
                <AddCompanyModal
                    type={companyTypeForModal}
                    onAddCompany={handleAddCompanyAndCloseModal}
                    onClose={() => setIsAddCompanyModalOpen(false)}
                />
            )}
            {isAddContactModalOpen && (
                <AddContactModal
                    onAddContact={handleAddContactAndCloseModal}
                    onClose={() => setIsAddContactModalOpen(false)}
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
                <HPUSizingModal onClose={() => setIsHPUSizingModalOpen(false)} />
            )}
            {isEstimateCalculatorOpen && (
                <EstimateCalculatorModal
                    onUpdateProjectPrice={handleUpdateProjectPriceAndCloseModal}
                    onClose={() => setIsEstimateCalculatorOpen(false)}
                />
            )}
        </div>
    );
}

export default App;