import { useState, useEffect } from 'react';

// Helper to get API URL from env or fallback
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
import type { Project, Company, Contact, TeamMember, ProjectFile, Currency } from '../types';
import { CompanyType } from '../types';
import { INITIAL_PROJECTS, INITIAL_COMPANIES, INITIAL_CONTACTS } from '../constants';

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
    const [companies, setCompanies] = useState<Company[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
        const loadedProjects = loadFromLocalStorage('crm_projects', INITIAL_PROJECTS);
        return loadedProjects[0]?.id || null;
    });

    useEffect(() => saveToLocalStorage('crm_projects', projects), [projects]);

    // Fetch companies from backend
    useEffect(() => {
        fetch(`${API_URL}/api/companies`)
            .then(res => res.json())
            .then(data => setCompanies(data))
            .catch(err => {
                console.error('Failed to fetch companies:', err);
                setCompanies([]);
            });
    }, []);

    // Fetch contacts from backend
    useEffect(() => {
        fetch(`${API_URL}/api/contacts`)
            .then(res => res.json())
            .then(data => setContacts(data))
            .catch(err => {
                console.error('Failed to fetch contacts:', err);
                setContacts([]);
            });
    }, []);

    // Fetch team members from backend
    useEffect(() => {
        fetch(`${API_URL}/api/team-members`)
            .then(res => res.json())
            .then(data => setTeamMembers(data))
            .catch(err => {
                console.error('Failed to fetch team members:', err);
                setTeamMembers([]);
            });
    }, []);

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
    

    const handleAddCompany = async (newCompany: Omit<Company, 'id'>) => {
        try {
            // Normalize type to enum value
            let normalizedType = newCompany.type;
            if (Object.values(CompanyType).includes(newCompany.type as CompanyType)) {
                normalizedType = newCompany.type;
            } else {
                // Try to match ignoring case/whitespace
                const found = Object.values(CompanyType).find(
                    t => t.toLowerCase().replace(/\s+/g, '') === newCompany.type.toLowerCase().replace(/\s+/g, '')
                );
                if (found) normalizedType = found;
            }
            const res = await fetch(`${API_URL}/api/companies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newCompany, type: normalizedType })
            });
            if (!res.ok) throw new Error('Failed to add company');
            const created = await res.json();
            setCompanies(prev => [created, ...prev]);
        } catch (err) {
            console.error('Add company error:', err);
        }
    };


    const handleAddContact = async (newContact: Omit<Contact, 'id'>) => {
        try {
            const res = await fetch(`${API_URL}/api/contacts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newContact)
            });
            if (!res.ok) throw new Error('Failed to add contact');
            const created = await res.json();
            setContacts(prev => [created, ...prev]);
        } catch (err) {
            console.error('Add contact error:', err);
        }
    };


    const handleAddTeamMember = async (newMember: Omit<TeamMember, 'id'>) => {
        try {
            const res = await fetch(`${API_URL}/api/team-members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newMember.name,
                    initials: newMember.initials,
                    jobTitle: newMember.jobTitle
                })
            });
            if (!res.ok) throw new Error('Failed to add team member');
            const created = await res.json();
            setTeamMembers(prev => [created, ...prev]);
        } catch (err) {
            console.error('Add team member error:', err);
        }
    };


    const handleDeleteTeamMember = async (memberId: string) => {
        try {
            const res = await fetch(`${API_URL}/api/team-members/${memberId}`, { method: 'DELETE' });
            if (!res.ok && res.status !== 204) throw new Error('Failed to delete team member');
            setProjects(prevProjects =>
                prevProjects.map(p => p.salesRepId === memberId ? { ...p, salesRepId: undefined } : p)
            );
            setTeamMembers(prev => prev.filter(m => m.id !== memberId));
        } catch (err) {
            console.error('Delete team member error:', err);
        }
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
