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

    // --- Moved handleUpdateTeamMember here so it's defined before return ---
    const handleUpdateTeamMember = async (member: TeamMember) => {
        try {
            const res = await fetch(`${API_URL}/api/team-members/${member.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    first_name: member.first_name,
                    last_name: member.last_name,
                    initials: member.initials,
                    jobTitle: member.jobTitle
                })
            });
            if (!res.ok) throw new Error('Failed to update team member');
            const updatedRaw = await res.json();
            const updated = {
                ...updatedRaw,
                jobTitle: updatedRaw.job_title,
                name: `${updatedRaw.first_name} ${updatedRaw.last_name}`
            };
            setTeamMembers(prev => prev.map(m => m.id === updated.id ? updated : m));
        } catch (err) {
            console.error('Update team member error:', err);
        }
    };

    // Backend fetch helpers we can reuse for reloads
    const fetchCompanies = async () => {
        try {
            const res = await fetch(`${API_URL}/api/companies`);
            const data = await res.json();
            setCompanies(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch companies:', err);
            setCompanies([]);
        }
    };

    const fetchContacts = async () => {
        try {
            const res = await fetch(`${API_URL}/api/contacts`);
            const data = await res.json();
            setContacts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch contacts:', err);
            setContacts([]);
        }
    };

    const fetchTeamMembers = async () => {
        try {
            const res = await fetch(`${API_URL}/api/team-members`);
            const data = await res.json();
            setTeamMembers((Array.isArray(data) ? data : []).map((m: any) => {
                const hasSplit = m.first_name || m.last_name;
                let first = m.first_name;
                let last = m.last_name;
                if (!hasSplit && m.name) {
                    const parts = String(m.name).trim().split(/\s+/);
                    first = parts.shift() || '';
                    last = parts.join(' ');
                }
                const initials = m.initials || `${(first || '').charAt(0)}${(last || '').charAt(0)}`.toUpperCase();
                return {
                    ...m,
                    first_name: first || '',
                    last_name: last || '',
                    initials,
                    jobTitle: m.job_title ?? m.jobTitle,
                    name: `${first || ''} ${last || ''}`.trim()
                };
            }));
        } catch (err) {
            console.error('Failed to fetch team members:', err);
            setTeamMembers([]);
        }
    };

    // Initial loads
    useEffect(() => { fetchCompanies(); }, []);

    useEffect(() => { fetchContacts(); }, []);

    useEffect(() => { fetchTeamMembers(); }, []);

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
            console.log('[useCrmData] handleAddProject called with:', newProject);
            const normalized = normalizeProjectIds(newProject);
            console.log('[useCrmData] Normalized project:', normalized);
            const res = await fetch(`${API_URL}/api/projects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(normalized)
            });
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error('Failed to add project: ' + errorText);
            }
            const created = await res.json();
            setProjects(prev => [created, ...prev]);
            setSelectedProjectId(created.id);
        } catch (err) {
            console.error('[useCrmData] Add project error:', err);
            alert('Failed to add project. See console for details.');
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

    // Create company with minimal CSV-aligned fields supported by backend POST
    const handleCreateCompanySimple = async (payload: { name: string; type?: string; location?: string; address?: string; website?: string; }) => {
        try {
            if (!payload?.name) throw new Error('Name is required');
            const res = await fetch(`${API_URL}/api/companies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Failed to add company');
            const created = await res.json();
            setCompanies(prev => [created, ...prev]);
            return created;
        } catch (err) {
            console.error('Create company error:', err);
            throw err;
        }
    };

    // Update company; accepts partial body with CSV column names or compat names, and id
    const handleUpdateCompany = async (update: any) => {
        try {
            const id = update?.id;
            if (!id) throw new Error('Missing company id');
            const body = { ...update };
            delete body.id;
            const res = await fetch(`${API_URL}/api/companies/${id}` , {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!res.ok) throw new Error('Failed to update company');
            const updated = await res.json();
            setCompanies(prev => prev.map(c => c.id === updated.id ? updated : c));
            return updated;
        } catch (err) {
            console.error('Update company error:', err);
            throw err;
        }
    };

    const handleDeleteCompany = async (id: string | number) => {
        try {
            const res = await fetch(`${API_URL}/api/companies/${id}`, { method: 'DELETE' });
            if (!res.ok && res.status !== 204) throw new Error('Failed to delete company');
            setCompanies(prev => prev.filter(c => c.id !== id));
        } catch (err) {
            console.error('Delete company error:', err);
            throw err;
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
                    first_name: newMember.first_name,
                    last_name: newMember.last_name,
                    initials: newMember.initials,
                    jobTitle: newMember.jobTitle
                })
            });
            if (!res.ok) throw new Error('Failed to add team member');
            const createdRaw = await res.json();
            const created = {
                ...createdRaw,
                jobTitle: createdRaw.job_title,
                name: `${createdRaw.first_name} ${createdRaw.last_name}`
            };
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
    handleCreateCompanySimple,
    handleUpdateCompany,
    handleDeleteCompany,
        handleAddContact,
        handleAddTeamMember,
        handleUpdateTeamMember,
        handleDeleteTeamMember,
        handleUploadFiles,
        handleDeleteFile,
    handleUpdateProjectPrice,
    // Expose reload helpers for components to refresh after imports, etc.
    reloadCompanies: fetchCompanies,
    reloadContacts: fetchContacts,
    reloadTeamMembers: fetchTeamMembers
    };
};
