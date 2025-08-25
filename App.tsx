import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { ExitDoorIcon, UsersIcon, BellIcon } from './components/icons';
import { IconSidebar } from './components/IconSidebar';
import FilesBrowser from './components/FilesBrowser';
import { Dashboard } from './components/Dashboard';
import { ProjectPipelineView } from './components/ProjectPipelineView';
import CompanyInfoPage from './components/CompanyInfoPage';
import { AddProjectModal } from './components/AddDealModal';
import { EditProjectModal } from './components/EditProjectModal';
import { AddCompanyModal } from './components/AddCompanyModal';
import { AddContactModal } from './components/AddContactModal';
import { ManageTeamModal } from './components/ManageTeamModal';
import { HPUSizingModal } from './components/HPUSizingModal';
import { EstimateCalculatorModal } from './components/EstimateCalculatorModal';
import type { Project, Company, Contact, Currency, Activity } from './types';
import { CompanyType, ProjectType } from './types';
import { useData } from './context/DataContext';
import ActivitySlideOver from './components/ActivitySlideOver';

type View = 'dashboard' | 'pipeline' | 'companyInfo' | 'files';

interface AppProps {
    user: { name: string; initials: string };
    onLogout: () => void;
}

const App: React.FC<AppProps> = ({ user, onLogout }) => {
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
        handleUpdateTeamMember,
        handleDeleteTeamMember,
        handleUploadFiles,
    handleDeleteFile,
    handleUpdateProjectPrice,
        activitiesByProject,
        reloadActivitiesForProject,
        unreadSummary,
        reloadUnreadSummary,
        markProjectActivitiesRead,
    } = useData();
    // Update project price from estimator and close the modal
    const handleUpdateProjectPriceAndCloseModal = (price: number, currency: Currency, selfCostPerVessel?: number) => {
        if (selectedProjectId) {
            handleUpdateProjectPrice(selectedProjectId, price, currency, selfCostPerVessel);
        }
        setIsEstimateCalculatorOpen(false);
    };


    const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
    const [newProjectType, setNewProjectType] = useState<ProjectType>(ProjectType.FUEL_TRANSFER);
    const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
    const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
    const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);
    const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
    const [isManageTeamModalOpen, setIsManageTeamModalOpen] = useState(false);
    const [isHPUSizingModalOpen, setIsHPUSizingModalOpen] = useState(false);
    const [isEstimateCalculatorOpen, setIsEstimateCalculatorOpen] = useState(false);
    const [activeView, setActiveView] = useState<View>('dashboard');
    const [companyTypeForModal, setCompanyTypeForModal] = useState<CompanyType | null>(null);
    const [isActivityOpen, setIsActivityOpen] = useState(false);
    const [activityMenuOpen, setActivityMenuOpen] = useState(false);
    const [activityProjectId, setActivityProjectId] = useState<string | null>(null);
    // Use server unread summary
    const activitySummary = unreadSummary;

    // When opening a project’s activity, mark currently visible ones as read
    const openActivityForProject = (pid: string) => {
        setActivityProjectId(pid);
        setIsActivityOpen(true);
    // mark current list as read on the server and refresh summary
    markProjectActivitiesRead(pid).then(() => reloadUnreadSummary()).catch(() => {});
        setActivityMenuOpen(false);
    };

    // Ensure activities are loaded across projects when opening the bell menu
    React.useEffect(() => {
        if (!activityMenuOpen) return;
        const loadAll = async () => {
            try {
                await Promise.all(
                    (projects || []).map(p => reloadActivitiesForProject(String(p.id)).catch(() => null))
                );
                await reloadUnreadSummary();
            } catch {}
        };
        loadAll();
    }, [activityMenuOpen, projects, reloadActivitiesForProject, reloadUnreadSummary]);

    // Do not show Activity when navigating to Pipeline via sidebar; only open via explicit buttons
    React.useEffect(() => {
        if (activeView === 'pipeline') {
            setIsActivityOpen(false);
            setActivityProjectId(null);
            setActivityMenuOpen(false);
        }
    }, [activeView]);

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

    const handleAddContactAndCloseModal = (newContact: Omit<Contact, 'id'>) => {
        handleAddContact(newContact);
        setIsAddContactModalOpen(false);
    };

    const handleOpenEditModal = (project: Project) => {
        setProjectToEdit(project);
        setIsEditProjectModalOpen(true);
    };

    const pageTitle = useMemo(() => {
        if (activeView === 'pipeline') return 'Project Pipeline';
        if (activeView === 'companyInfo') return 'Company Info';
        return 'Dashboard';
    }, [activeView]);

    return (
        <div className="flex h-screen font-sans bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-0 pl-10">
            <IconSidebar activeView={activeView} onNavigate={setActiveView} />
            <div className="flex flex-col flex-1 overflow-hidden pt-20"> {/* pt-20 for header height */}
                <Header
                    title={pageTitle}
                    rightContent={
                        <div className="flex items-center gap-2">
                                                                                    <div className="relative">
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                setActivityMenuOpen(v => !v);
                                                                                                // Clear badge by marking all project activities as read for projects currently listed
                                                                                                unreadSummary.entries.forEach(e => markProjectActivitiesRead(e.projectId).catch(()=>{}));
                                                                                                // refresh summary after clearing
                                                                                                reloadUnreadSummary().catch(()=>{});
                                                                                            }}
                                                                                            className="relative flex items-center justify-center p-1 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
                                                                                            aria-label="Activity notifications"
                                                                                            title="Activity notifications"
                                                                                        >
                                                                                            <BellIcon className="w-5 h-5" />
                                                                                            {activitySummary.total > 0 && (
                                                                                                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] leading-4 text-center">
                                                                                                    {activitySummary.total > 99 ? '99+' : activitySummary.total}
                                                                                                </span>
                                                                                            )}
                                                                                        </button>
                                                                                        {activityMenuOpen && (
                                                                                            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md shadow-lg z-50">
                                                                                                <div className="py-2 max-h-72 overflow-auto">
                                                                                                    {activitySummary.entries.length === 0 ? (
                                                                                                        <div className="px-3 py-2 text-sm text-gray-500">No new activity</div>
                                                                                                    ) : (
                                                                                                                                                activitySummary.entries.map(({ projectId, count }) => {
                                                                                                                                                    const p = projects.find(pr => pr.id === projectId);
                                                                                                                                                    const label = p
                                                                                                                                                        ? `[${p.opportunityNumber || 'OPP?'}] ${p.name}`
                                                                                                                                                        : `Project ${projectId}`;
                                                                                                            return (
                                                                                                                <button
                                                                                                                    key={projectId}
                                                                                                                    onClick={() => openActivityForProject(projectId)}
                                                                                                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
                                                                                                                >
                                                                                                                                                            <span className="truncate mr-2">{label}</span>
                                                                                                                    <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-blue-600 text-white text-[11px]">{count}</span>
                                                                                                                </button>
                                                                                                            );
                                                                                                        })
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                            <button
                                onClick={() => setIsManageTeamModalOpen(true)}
                                className="flex items-center justify-center p-1 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
                                aria-label="Manage team"
                                title="Manage team"
                            >
                                <UsersIcon className="w-5 h-5" />
                            </button>
                            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm" title={user?.name || 'User'}>
                                {user?.initials || 'ST'}
                            </div>
                            <button
                                onClick={onLogout}
                                className="p-1 rounded-md bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800"
                                aria-label="Logout"
                                title="Logout"
                            >
                                <ExitDoorIcon className="w-5 h-5" />
                            </button>
                        </div>
                    }
                />
                {activeView === 'dashboard' && (
                    <main className="flex-1 overflow-y-auto p-0">
                        {/* Find team member by initials (case-insensitive) and use their first_name, fallback to username */}
                        <Dashboard
                            userFirstName={
                                (teamMembers.find(
                                    tm => tm.initials && tm.initials.toLowerCase() === user.initials?.toLowerCase()
                                )?.first_name) || user.name.split(' ')[0] || user.name || ''
                            }
                        />
                    </main>
                )}
                {activeView === 'companyInfo' && (
                    <main className="flex-1 overflow-y-auto p-0 pl-2">
                        <CompanyInfoPage />
                    </main>
                )}
                {activeView === 'files' && (
                    <main className="flex-1 overflow-y-auto p-0">
                        <FilesBrowser />
                    </main>
                )}
                {/* Slide-in Project Pipeline View */}
                <div
                    className={`fixed top-16 left-12 right-0 bottom-0 z-30 transition-transform duration-500 ease-in-out bg-gray-100 dark:bg-gray-900 shadow-xl border-l border-gray-200 dark:border-gray-700 ${
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
                        onAddProjectClick={(type) => { setNewProjectType(type); setIsAddProjectModalOpen(true); }}
                        onEditProject={handleOpenEditModal}
                        selectedProject={selectedProject}
                        onUploadFiles={handleUploadFiles}
                        onDeleteFile={handleDeleteFile}
                        onOpenHPUSizing={() => setIsHPUSizingModalOpen(true)}
                        onOpenEstimateCalculator={() => setIsEstimateCalculatorOpen(true)}
                        isActive={activeView === 'pipeline'}
                        onOpenActivity={(pid) => openActivityForProject(pid)}
                    />
                </div>
            </div>
            {isAddProjectModalOpen && (
                <AddProjectModal
                    projectType={newProjectType}
                    onAddProject={handleAddProjectAndCloseModal}
                    onClose={() => setIsAddProjectModalOpen(false)}
                    companies={companies}
                    contacts={contacts}
                    teamMembers={teamMembers}
                    projects={projects}
                    onAddCompanyClick={(type) => { setCompanyTypeForModal(type); setIsAddCompanyModalOpen(true); }}
                    onAddContactClick={() => setIsAddContactModalOpen(true)}
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
                    initialType={companyTypeForModal}
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
                    onUpdateTeamMember={handleUpdateTeamMember}
                />
            )}
            {isHPUSizingModalOpen && (
                <HPUSizingModal onClose={() => setIsHPUSizingModalOpen(false)} />
            )}
            {isEstimateCalculatorOpen && selectedProject && (
                <EstimateCalculatorModal
                    project={selectedProject}
                    companies={companies}
                    teamMembers={teamMembers}
                    onUpdateProjectPrice={handleUpdateProjectPriceAndCloseModal}
                    onClose={() => setIsEstimateCalculatorOpen(false)}
                />
            )}
            {/* Global Activity slide-over to ensure visibility of the button in header */}
            {activityProjectId && (
                <ActivitySlideOver
                    open={isActivityOpen}
            onClose={() => setIsActivityOpen(false)}
            projectId={activityProjectId}
            activities={(activitiesByProject?.[activityProjectId] || []) as Activity[]}
                />
            )}
        </div>
    );
}

export default App;