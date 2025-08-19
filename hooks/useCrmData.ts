import { useState, useEffect } from 'react';

// Helper to get API URL from env or fallback
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
import type { Project, Company, Contact, TeamMember, ProjectFile, Currency } from '../types';
import { INITIAL_PROJECTS, INITIAL_COMPANIES, INITIAL_CONTACTS, INITIAL_TEAM_MEMBERS } from '../constants';

const loadFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
    try {
        const storedValue = localStorage.getItem(key);
        return storedValue ? JSON.parse(storedValue) : defaultValue;
    } catch (error) {
        console.error(`Error reading localStorage key “${key}”:`, error);
        return defaultValue;
    }
};

const saveToLocalStorage = <T,>(key: string, value: T) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error setting localStorage key “${key}”:`, error);
    }
};

export const useCrmData = () => {
    const [projects, setProjects] = useState<Project[]>(() => loadFromLocalStorage('crm_projects', INITIAL_PROJECTS));
    const [companies, setCompanies] = useState<Company[]>(() => loadFromLocalStorage('crm_companies', INITIAL_COMPANIES));
    const [contacts, setContacts] = useState<Contact[]>(() => loadFromLocalStorage('crm_contacts', INITIAL_CONTACTS));
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => loadFromLocalStorage('crm_team_members', INITIAL_TEAM_MEMBERS));
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
        const loadedProjects = loadFromLocalStorage('crm_projects', INITIAL_PROJECTS);
        return loadedProjects[0]?.id || null;
    });

    useEffect(() => saveToLocalStorage('crm_projects', projects), [projects]);
    useEffect(() => saveToLocalStorage('crm_companies', companies), [companies]);
    useEffect(() => saveToLocalStorage('crm_contacts', contacts), [contacts]);
    useEffect(() => saveToLocalStorage('crm_team_members', teamMembers), [teamMembers]);

    // Ensure selectedProjectId is valid if projects change
    useEffect(() => {
        if (!projects.find(p => p.id === selectedProjectId)) {
            setSelectedProjectId(projects[0]?.id || null);
        }
    }, [projects, selectedProjectId]);


    const handleAddProject = (newProject: Omit<Project, 'id'>) => {
        const projectWithId: Project = {
            ...newProject,
            id: `proj-${Date.now()}`,
            files: [],
        };
        setProjects(prevProjects => [projectWithId, ...prevProjects]);
        setSelectedProjectId(projectWithId.id);
    };
    
    const handleUpdateProject = (updatedProject: Project) => {
        setProjects(prevProjects =>
            prevProjects.map(p => (p.id === updatedProject.id ? updatedProject : p))
        );
    };
    
    const handleAddCompany = (newCompany: Omit<Company, 'id'>) => {
        const companyWithId: Company = {
            ...newCompany,
            id: `comp-${Date.now()}`
        };
        setCompanies(prev => [...prev, companyWithId]);
    };

    const handleAddContact = (newContact: Omit<Contact, 'id'>) => {
        const contactWithId: Contact = {
            ...newContact,
            id: `cont-${Date.now()}`
        };
        setContacts(prev => [...prev, contactWithId]);
    };

    const handleAddTeamMember = (newMember: Omit<TeamMember, 'id'>) => {
        const memberWithId: TeamMember = {
            ...newMember,
            id: `team-${Date.now()}`
        };
        setTeamMembers(prev => [...prev, memberWithId]);
    };

    const handleDeleteTeamMember = (memberId: string) => {
        setProjects(prevProjects =>
            prevProjects.map(p => p.salesRepId === memberId ? { ...p, salesRepId: undefined } : p)
        );
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
                        content: (event.target?.result as string).split(',')[1],
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
                        return { ...p, files: [...(p.files || []), ...newFiles] };
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
    
    const handleUpdateProjectPrice = (projectId: string, price: number, currency: Currency) => {
        setProjects(prevProjects =>
            prevProjects.map(p => {
                if (p.id === projectId) {
                    return {
                        ...p,
                        pricePerVessel: price,
                        currency: currency,
                        value: p.numberOfVessels * price,
                    };
                }
                return p;
            })
        );
    };

    return {
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
    };
};
