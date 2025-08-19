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



    // Normalize all related IDs to integers if possible
    const normalizeProjectIds = (project: any) => {
        const intOrNull = (v: any) => (v && !isNaN(Number(v)) ? Number(v) : null);
        return {
            ...project,
            salesRepId: intOrNull(project.salesRepId),
            shipyardId: intOrNull(project.shipyardId),
            vesselOwnerId: intOrNull(project.vesselOwnerId),
            designCompanyId: intOrNull(project.designCompanyId),
            primaryContactId: intOrNull(project.primaryContactId),
        };
    };

    const handleAddProject = async (newProject: Omit<Project, 'id'>) => {
        try {
            const normalized = normalizeProjectIds(newProject);
            const res = await fetch(`${API_URL}/api/projects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(normalized)
            });
            if (!res.ok) throw new Error('Failed to add project');
            const created = await res.json();
            setProjects(prev => [created, ...prev]);
            setSelectedProjectId(created.id);
        } catch (err) {
            console.error('Add project error:', err);
        }
    };

    const handleUpdateProject = async (updatedProject: Project) => {
        try {
            const normalized = normalizeProjectIds(updatedProject);
            const res = await fetch(`${API_URL}/api/projects/${updatedProject.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(normalized)
            });
            if (!res.ok) throw new Error('Failed to update project');
            const updated = await res.json();
            setProjects(prev => prev.map(p => (p.id === updated.id ? updated : p)));
        } catch (err) {
            console.error('Update project error:', err);
        }
    };

    // File upload and product upload should use backend as well (not just local)
    const handleUploadFiles = async (projectId: string, files: FileList) => {
        const filePromises = Array.from(files).map(file => {
            return new Promise<ProjectFile>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    try {
                        const fileData = {
                            projectId: Number(projectId),
                            name: file.name,
                            type: file.type,
                            size: file.size,
                            content: (event.target?.result as string).split(',')[1],
                        };
                        const res = await fetch(`${API_URL}/api/project-files`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(fileData)
                        });
                        if (!res.ok) throw new Error('Failed to upload file');
                        const created = await res.json();
                        resolve(created);
                    } catch (err) {
                        reject(err);
                    }
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

    // Add product to backend
    const handleAddProduct = async (projectId: string, product: Omit<Product, 'id'>) => {
        try {
            const res = await fetch(`${API_URL}/api/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: Number(projectId), ...product })
            });
            if (!res.ok) throw new Error('Failed to add product');
            // Optionally update local state if needed
        } catch (err) {
            console.error('Add product error:', err);
        }
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
            // Normalize companyId to integer if possible and map to company_id for backend
            let company_id = newContact.companyId;
            if (company_id && typeof company_id === 'string' && !isNaN(Number(company_id))) {
                company_id = Number(company_id);
            }
            const res = await fetch(`${API_URL}/api/contacts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newContact.name,
                    email: newContact.email,
                    phone: newContact.phone,
                    company_id
                })
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
