import { useState, useEffect } from 'react';

// Helper to get API URL with runtime overrides and Render heuristic
function resolveApiBase(): string {
    // Build-time env from Vite (prefer this in hosted builds)
    const envUrl = (import.meta as any)?.env?.VITE_API_URL as string | undefined;

    if (envUrl && /^https?:\/\//i.test(envUrl)) return envUrl;

    // URL param override (?api=https://backend.example.com)
    try {
        if (typeof window !== 'undefined') {
            const q = new URLSearchParams(window.location.search);
            const api = q.get('api');
            if (api && /^https?:\/\//i.test(api)) {
                localStorage.setItem('api_url_override', api);
                // Clean the URL so param doesn't stick around
                const url = new URL(window.location.href);
                url.searchParams.delete('api');
                window.history.replaceState({}, '', url.toString());
            }
        }
    } catch {}

    // LocalStorage override (useful in local/dev without VITE_API_URL)
    try {
        if (typeof localStorage !== 'undefined') {
            const o = localStorage.getItem('api_url_override');
            if (o && /^https?:\/\//i.test(o)) return o;
        }
    } catch {}

    // Last resort: localhost (dev)
    return 'http://localhost:4000';
}

export const API_URL = resolveApiBase();
// Log resolved API base once for debugging production routing
try { if (typeof window !== 'undefined') console.info('[CRM] API_URL =', API_URL); } catch {}
const MOCK = (() => {
    const v = String((import.meta as any)?.env?.VITE_MOCK_MODE ?? '').toLowerCase().trim();
    return v === '1' || v === 'true' || v === 'yes';
})();
import type { Project, Company, Contact, TeamMember, ProjectFile, Currency, Task, Activity, Product } from '../types';
import { CompanyType } from '../types';
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
    const [companies, setCompanies] = useState<Company[]>(() => (MOCK ? INITIAL_COMPANIES : []));
    const [contacts, setContacts] = useState<Contact[]>(() => (MOCK ? INITIAL_CONTACTS : []));
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => (MOCK ? INITIAL_TEAM_MEMBERS : []));
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
        const loadedProjects = loadFromLocalStorage('crm_projects', INITIAL_PROJECTS);
        return loadedProjects[0]?.id || null;
    });
    const [tasksByProject, setTasksByProject] = useState<Record<string, Task[]>>({});
    const [activitiesByProject, setActivitiesByProject] = useState<Record<string, Activity[]>>({});
    const [unreadSummary, setUnreadSummary] = useState<{ entries: { projectId: string; count: number }[]; total: number }>({ entries: [], total: 0 });

    useEffect(() => saveToLocalStorage('crm_projects', projects), [projects]);
    const authHeaders = () => {
        const t = localStorage.getItem('token');
        return t ? { Authorization: `Bearer ${t}` } : {};
    };

    const fetchProjects = async () => {
        if (MOCK) return; // use local initial projects
        try {
            const res = await fetch(`${API_URL}/api/projects`);
            const data = await res.json();
            if (Array.isArray(data)) {
                if (data.length) {
                    setProjects(data);
                } else {
                    console.warn('[useCrmData] /api/projects returned empty list; using demo seed for visibility');
                    setProjects(INITIAL_PROJECTS);
                }
            } else {
                console.warn('[useCrmData] /api/projects returned unexpected payload; using demo seed');
                setProjects(INITIAL_PROJECTS);
            }
        } catch (err) {
            console.error('Failed to fetch projects:', err);
            // Fallback to demo data so UI isn’t blank in dev
            setProjects(INITIAL_PROJECTS);
        }
    };

    const fetchTasksForProject = async (projectId: string) => {
        if (MOCK) { return; }
        try {
            const res = await fetch(`${API_URL}/api/projects/${projectId}/tasks`);
            const data = await res.json();
            setTasksByProject(prev => ({ ...prev, [projectId]: Array.isArray(data) ? data : [] }));
        } catch (err) {
            console.error('Failed to fetch tasks:', err);
        }
    };

    const fetchActivitiesForProject = async (projectId: string) => {
        if (MOCK) { return; }
        try {
            const res = await fetch(`${API_URL}/api/projects/${projectId}/activities`);
            const data = await res.json();
            setActivitiesByProject(prev => ({ ...prev, [projectId]: Array.isArray(data) ? data : [] }));
        } catch (err) {
            console.error('Failed to fetch activities:', err);
        }
    };

    const fetchUnreadSummary = async () => {
        if (MOCK) { return; }
        try {
            const res = await fetch(`${API_URL}/api/activities/unread-summary`, { headers: { ...authHeaders() } });
            if (!res.ok) return;
            const data = await res.json();
            if (data && typeof data.total === 'number' && Array.isArray(data.entries)) {
                setUnreadSummary({ total: data.total, entries: data.entries.map((e: any) => ({ projectId: String(e.projectId), count: Number(e.count) })) });
            }
        } catch (err) {
            console.error('Failed to fetch unread summary:', err);
        }
    };

    const markProjectActivitiesRead = async (projectId: string) => {
        if (MOCK) { return; }
        try {
            const res = await fetch(`${API_URL}/api/projects/${projectId}/activities/mark-read`, { method: 'POST', headers: { ...authHeaders() } });
            if (!res.ok) return;
            // Refresh summary after marking read
            try { await fetchUnreadSummary(); } catch {}
        } catch (err) {
            console.error('Failed to mark read:', err);
        }
    };


    // --- Moved handleUpdateTeamMember here so it's defined before return ---
    const handleUpdateTeamMember = async (member: TeamMember) => {
        if (MOCK) {
            setTeamMembers(prev => prev.map(m => m.id === member.id ? { ...m, ...member } : m));
            return;
        }
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
        if (MOCK) { setCompanies(INITIAL_COMPANIES); return; }
        try {
            const res = await fetch(`${API_URL}/api/companies`);
            const data = await res.json();
            if (Array.isArray(data) && data.length) {
                setCompanies(data as any);
            } else {
                console.warn('[useCrmData] /api/companies empty or invalid; using demo seed');
                setCompanies(INITIAL_COMPANIES);
            }
        } catch (err) {
            console.error('Failed to fetch companies:', err);
            setCompanies(INITIAL_COMPANIES);
        }
    };

    const fetchContacts = async () => {
        if (MOCK) { setContacts(INITIAL_CONTACTS); return; }
        try {
            const res = await fetch(`${API_URL}/api/contacts`);
            const data = await res.json();
            if (Array.isArray(data) && data.length) {
                setContacts(data as any);
            } else {
                console.warn('[useCrmData] /api/contacts empty or invalid; using demo seed');
                setContacts(INITIAL_CONTACTS);
            }
        } catch (err) {
            console.error('Failed to fetch contacts:', err);
            setContacts(INITIAL_CONTACTS);
        }
    };

    const fetchTeamMembers = async () => {
        if (MOCK) { setTeamMembers(INITIAL_TEAM_MEMBERS); return; }
        try {
            const res = await fetch(`${API_URL}/api/team-members`);
            const data = await res.json();
            const list = Array.isArray(data) ? data : [];
            const normalized = list.map((m: any) => {
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
            });
            if (normalized.length) {
                setTeamMembers(normalized);
            } else {
                console.warn('[useCrmData] /api/team-members empty or invalid; using demo seed');
                // Seed team with demo initials so header avatar resolves
                setTeamMembers(INITIAL_TEAM_MEMBERS.map((t: any) => ({
                    ...t,
                    first_name: t.first_name || (t.name?.split(' ')[0] || ''),
                    last_name: t.last_name || (t.name?.split(' ').slice(1).join(' ') || ''),
                })) as any);
            }
        } catch (err) {
            console.error('Failed to fetch team members:', err);
            setTeamMembers(INITIAL_TEAM_MEMBERS as any);
        }
    };

    // Initial loads
    useEffect(() => { if (!MOCK) { fetchProjects(); fetchUnreadSummary(); } }, []);
    useEffect(() => { if (!MOCK) fetchCompanies(); }, []);

    useEffect(() => { if (!MOCK) fetchContacts(); }, []);

    useEffect(() => { if (!MOCK) fetchTeamMembers(); }, []);

    // Ensure selectedProjectId is valid if projects change
    useEffect(() => {
        if (!projects.find(p => p.id === selectedProjectId)) {
            setSelectedProjectId(projects[0]?.id || null);
        }
    }, [projects, selectedProjectId]);

    // Load tasks when project selection changes
    useEffect(() => {
        if (selectedProjectId) fetchTasksForProject(selectedProjectId);
    if (selectedProjectId) fetchActivitiesForProject(selectedProjectId);
    }, [selectedProjectId]);

    // Lightweight polling for unread summary while app is visible and user is authed
    useEffect(() => {
        if (MOCK) return;
        const POLL_MS = 45000; // 45s
        let timer: number | undefined;

        const tick = async () => {
            try {
                const hasToken = !!localStorage.getItem('token');
                if (!hasToken) return; // only poll when logged in
                if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return; // pause in background
                await fetchUnreadSummary();
            } catch {}
        };

        // Start interval
        timer = window.setInterval(tick, POLL_MS);

        // Also refresh when tab becomes visible again
        const onVisibility = () => {
            if (document.visibilityState === 'visible') tick();
        };
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            if (timer) window.clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, []);



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
        if (MOCK) {
            const created: Project = { id: `proj-${Date.now()}`, ...(newProject as any) } as Project;
            setProjects(prev => [created, ...prev]);
            setSelectedProjectId(created.id);
            return;
        }
        try {
            console.log('[useCrmData] handleAddProject called with:', newProject);
            const normalized = normalizeProjectIds(newProject);
            console.log('[useCrmData] Normalized project:', normalized);
            const res = await fetch(`${API_URL}/api/projects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
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
        if (MOCK) {
            setProjects(prev => prev.map(p => p.id === updatedProject.id ? { ...p, ...updatedProject } : p));
            return;
        }
        try {
            const normalized = normalizeProjectIds(updatedProject);
            const res = await fetch(`${API_URL}/api/projects/${updatedProject.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify(normalized)
            });
            if (!res.ok) throw new Error('Failed to update project');
            const updated = await res.json();
            setProjects(prev => prev.map(p => (p.id === updated.id ? updated : p)));
            // Refresh activity log after project update
            try { await fetchActivitiesForProject(String(updated.id)); } catch {}
        } catch (err) {
            console.error('Update project error:', err);
        }
    };

    // Patch a subset of project fields (server supports partial PUT bodies)
    const updateProjectFields = async (projectId: string, patch: Partial<Project> & Record<string, any>) => {
        // Optimistic local update
        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...patch } as Project : p));
        if (MOCK) return;
        try {
            const res = await fetch(`${API_URL}/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify(patch)
            });
            if (!res.ok) throw new Error('Failed to patch project');
            const updated = await res.json();
            setProjects(prev => prev.map(p => (p.id === updated.id ? updated : p)));
        } catch (err) {
            console.error('Patch project error:', err);
        }
    };

    // File upload and product upload should use backend as well (not just local)
    const handleUploadFiles = async (projectId: string, files: FileList) => {
        if (MOCK) {
            const newFiles: ProjectFile[] = Array.from(files).map(f => ({
                id: `file-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
                projectId,
                name: f.name,
                type: f.type,
                size: f.size,
                url: ''
            } as any));
            setProjects(prev => prev.map(p => p.id === projectId ? { ...p, files: [...(p.files || []), ...newFiles] } : p));
            return;
        }
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
        if (MOCK) {
            const created = { id: `comp-${Date.now()}`, ...newCompany } as any as Company;
            setCompanies(prev => [created, ...prev]);
            return;
        }
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
        if (MOCK) {
            const created = { id: `comp-${Date.now()}`, Company: payload.name, name: payload.name, ...payload } as any;
            setCompanies(prev => [created, ...prev]);
            return created;
        }
        try {
            if (!payload?.name) throw new Error('Name is required');
            const res = await fetch(`${API_URL}/api/companies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                let msg = 'Failed to add company';
                try { const txt = await res.text(); msg = `${res.status}: ${txt || msg}`; } catch {}
                throw new Error(msg);
            }
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
        if (MOCK) {
            const id = update?.id;
            if (!id) throw new Error('Missing company id');
            const body = { ...update };
            delete body.id;
            const updated = { id, ...body };
            setCompanies(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
            return updated as any;
        }
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
        if (MOCK) { setCompanies(prev => prev.filter(c => c.id !== id)); return; }
        // If ID isn't numeric (e.g., a local draft), just remove locally and skip server
        const idNum = Number(id);
        if (!Number.isInteger(idNum)) { setCompanies(prev => prev.filter(c => c.id !== id)); return; }
        try {
            const res = await fetch(`${API_URL}/api/companies/${idNum}`, { method: 'DELETE' });
            if (!res.ok && res.status !== 204) throw new Error('Failed to delete company');
            setCompanies(prev => prev.filter(c => String(c.id) !== String(idNum)));
        } catch (err) {
            console.error('Delete company error:', err);
            throw err;
        }
    };


    const handleAddContact = async (newContact: Omit<Contact, 'id'>) => {
        if (MOCK) {
            const created = { id: `cont-${Date.now()}`, ...newContact } as Contact;
            setContacts(prev => [created, ...prev]);
            return;
        }
        try {
            // Normalize companyId to integer if possible and map to company_id for backend
            let company_id: string | number | null = (newContact as any).companyId ?? null;
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
        if (MOCK) {
            const created = { id: `team-${Date.now()}`, ...newMember } as TeamMember;
            setTeamMembers(prev => [created, ...prev]);
            return;
        }
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
        if (MOCK) {
            setProjects(prevProjects => prevProjects.map(p => p.salesRepId === memberId ? { ...p, salesRepId: undefined } : p));
            setTeamMembers(prev => prev.filter(m => m.id !== memberId));
            return;
        }
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
    
    const handleUpdateProjectPrice = async (projectId: string, price: number, currency: Currency, selfCostPerVessel?: number) => {
        // Optimistic local update
        setProjects(prevProjects =>
            prevProjects.map(p => {
                if (p.id === projectId) {
                    const next: any = {
                        ...p,
                        pricePerVessel: price,
                        currency: currency,
                        value: p.numberOfVessels * price,
                    };
                    if (typeof selfCostPerVessel === 'number') {
                        next.selfCostPerVessel = selfCostPerVessel;
                        const gm = price > 0 ? Math.round(((price - selfCostPerVessel) / price) * 100) : undefined;
                        if (gm !== undefined) next.grossMarginPercent = gm;
                    }
                    return next;
                }
                return p;
            })
        );
        if (MOCK) return;
        try {
            const body: any = { pricePerVessel: price, currency };
            // Also update aggregate value server-side to keep in sync
            const proj = projects.find(p => p.id === projectId);
            if (proj) {
                body.value = (proj.numberOfVessels || 1) * price;
                if (typeof selfCostPerVessel === 'number') {
                    body.selfCostPerVessel = selfCostPerVessel;
                    if (price > 0) body.grossMarginPercent = Math.round(((price - selfCostPerVessel) / price) * 100);
                }
                // Include any known flow fields so a subsequent server response doesn't wipe optimistic UI
                if (proj.flowDescription !== undefined) body.flowDescription = proj.flowDescription;
                if (proj.flowCapacityM3h !== undefined) body.flowCapacityM3h = proj.flowCapacityM3h;
                if (proj.flowMwc !== undefined) body.flowMwc = proj.flowMwc;
                if (proj.flowPowerKw !== undefined) body.flowPowerKw = proj.flowPowerKw;
            }
            const res = await fetch(`${API_URL}/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify(body)
            });
            if (!res.ok) throw new Error('Failed to persist price');
            const updated = await res.json();
            setProjects(prev => prev.map(p => (p.id === updated.id ? updated : p)));
        } catch (err) {
            console.error('Persist price error:', err);
        }
    };

    // ---- Tasks CRUD ----
    const handleAddTask = async (projectId: string, task: Partial<Task>) => {
        if (MOCK) {
            const created: Task = {
                id: `task-${Date.now()}`,
                projectId,
                title: task.title || 'New Task',
                status: (task.status as any) || 'open',
                dueDate: task.dueDate || null,
                assignedTo: (task.assignedTo as any) || null,
                notes: task.notes || null,
                priority: (task.priority as any) || 2,
            };
            setTasksByProject(prev => ({ ...prev, [projectId]: [created, ...(prev[projectId] || [])] }));
            return created;
        }
        const res = await fetch(`${API_URL}/api/projects/${projectId}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(task)
        });
        if (!res.ok) throw new Error('Failed to add task');
        const created = await res.json();
        setTasksByProject(prev => ({ ...prev, [projectId]: [created, ...(prev[projectId] || [])] }));
    try { await fetchActivitiesForProject(projectId); } catch {}
        return created;
    };

    const handleUpdateTask = async (taskId: string, patch: Partial<Task> & { projectId: string }) => {
        const { projectId, ...body } = patch as any;
        if (MOCK) {
            setTasksByProject(prev => ({
                ...prev,
                [projectId]: (prev[projectId] || []).map(t => t.id === taskId ? { ...t, ...body } : t)
            }));
            return;
        }
        const res = await fetch(`${API_URL}/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error('Failed to update task');
        const updated = await res.json();
        setTasksByProject(prev => ({
            ...prev,
            [projectId]: (prev[projectId] || []).map(t => t.id === taskId ? updated : t)
        }));
    try { await fetchActivitiesForProject(projectId); } catch {}
    };

    const handleDeleteTask = async (projectId: string, taskId: string) => {
        if (MOCK) {
            setTasksByProject(prev => ({ ...prev, [projectId]: (prev[projectId] || []).filter(t => t.id !== taskId) }));
            return;
        }
    const res = await fetch(`${API_URL}/api/tasks/${taskId}`, { method: 'DELETE', headers: { ...authHeaders() } });
        if (!res.ok && res.status !== 204) throw new Error('Failed to delete task');
        setTasksByProject(prev => ({ ...prev, [projectId]: (prev[projectId] || []).filter(t => t.id !== taskId) }));
    try { await fetchActivitiesForProject(projectId); } catch {}
    };

    // ---- Activities CRUD ----
    const handleAddActivity = async (projectId: string, payload: Partial<Activity> & { content: string }) => {
        if (MOCK) {
            const created: Activity = {
                id: `act-${Date.now()}`,
                projectId,
                type: (payload.type as any) || 'note',
                content: payload.content,
                createdBy: (payload.createdBy as any) || null,
                createdAt: new Date().toISOString(),
            };
            setActivitiesByProject(prev => ({ ...prev, [projectId]: [created, ...(prev[projectId] || [])] }));
            return created;
        }
        const res = await fetch(`${API_URL}/api/projects/${projectId}/activities`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to add activity');
        const created = await res.json();
        setActivitiesByProject(prev => ({ ...prev, [projectId]: [created, ...(prev[projectId] || [])] }));
        return created;
    };

    // ---- Estimates & Quote helpers ----
    const saveProjectEstimate = async (projectId: string, type: string, data: any) => {
        if (MOCK) return { id: `est-${Date.now()}`, projectId, type, data } as any;
        const res = await fetch(`${API_URL}/api/projects/${projectId}/estimates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ type, data })
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    };

    const getProjectEstimate = async (projectId: string, type: string) => {
        if (MOCK) return null;
        const res = await fetch(`${API_URL}/api/projects/${projectId}/estimates?type=${encodeURIComponent(type)}`, { headers: { ...authHeaders() } });
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    };

    const generateProjectQuote = async (projectId: string, type: string = 'anti_heeling') => {
        if (MOCK) return null;
        const res = await fetch(`${API_URL}/api/projects/${projectId}/generate-quote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ type })
        });
        if (!res.ok) throw new Error(await res.text());
        const file = await res.json();
        // Attach to project.files in state for immediate visibility
        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, files: [...(p.files || []), file as any] } : p));
        return file;
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
    updateProjectFields,
    tasksByProject,
    handleAddTask,
    handleUpdateTask,
    handleDeleteTask,
    activitiesByProject,
    unreadSummary,
    handleAddActivity,
    saveProjectEstimate,
    getProjectEstimate,
    generateProjectQuote,
    reloadActivitiesForProject: fetchActivitiesForProject,
    reloadUnreadSummary: fetchUnreadSummary,
    markProjectActivitiesRead,
    // Expose reload helpers for components to refresh after imports, etc.
    reloadProjects: fetchProjects,
    reloadCompanies: fetchCompanies,
    reloadContacts: fetchContacts,
    reloadTeamMembers: fetchTeamMembers
    };
};
