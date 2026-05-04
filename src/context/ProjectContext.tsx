/**
 * Project Context - Manages projects state and CRUD operations
 */
import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { Project, Inspection, Invoice, PackingInfo, TechPackData, PPMeeting as PPMeetingType, ConsumptionData, OrderSheet } from '../../types';
import { projectService, mapFromDb } from '../services/projectService';
import { INITIAL_DATA } from '../../constants';
import { useAuth } from './AuthContext';
import { supabase } from '../../lib/supabase';

interface ProjectContextType {
    projects: Project[];
    loading: boolean;
    getProject: (id: string) => Project | undefined;
    createProject: (data: Partial<Project>) => Promise<Project | null>;
    updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
    deleteProject: (id: string) => Promise<void>;
    refreshProjects: () => Promise<Project[]>;
    refreshProject: (id: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// Default packing info
const createDefaultPacking = (): PackingInfo => ({
    division: 'BLOQUE',
    section: 'SENORA',
    invoiceRef: '',
    deliveryNoteNo: '',
    orderNumber: '',
    shipmentType: 'SEA SHIPMENT (ASSORT)',
    alarmedGoods: false,
    supplierCode: 'PROV-123',
    supplierName: 'FASHION COMFORT (BD) LTD',
    vatCode: 'VAT-BD-999',
    address: 'Dhaka, Bangladesh',
    phone: '+880-123',
    fax: '',
    email: 'logistics@fashioncomfort.bd',
    destination: 'Barcelona',
    deliveryAddress: '',
    shipmentDate: '',
    arrivalDate: '',
    arrivalTime: '',
    boxDetails: [],
    summaryRows: [],
    colorReferences: [],
    grossWeight: 0,
    grossWeightUnit: 'KGS',
    netWeight: 0,
    netWeightUnit: 'KGS',
    volume: 0,
    volumeUnit: 'CBM',
    cartonType: '',
    boxLengthCm: 0,
    boxWidthCm: 0,
    boxHeightCm: 0,
    remarks: '',
    attachments: [],
    comments: []
});

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(false);
    const { isAuthenticated, isLoading, user } = useAuth();
    const retriedRef = useRef(false);

    const refreshProjects = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await projectService.getProjects();
            if (error) throw new Error(error);
            setProjects(data || []);
            return data || [];
        } catch (err: any) {
            console.error("[ProjectService] Error fetching projects:", err.message || err);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch projects only after auth is fully initialized (profile loaded from DB).
    // The isLoading guard is critical: without it, data fetches fire with the wrong
    // permissions before the real profile arrives, causing empty results.
    useEffect(() => {
        if (isLoading || !isAuthenticated || !user) return;

        retriedRef.current = false;

        const fetchWithRetry = async () => {
            const result = await refreshProjects();

            // If no projects returned and we haven't retried yet,
            // wait briefly and try again (session may not have been ready)
            if (result.length === 0 && !retriedRef.current) {
                retriedRef.current = true;
                console.log('[ProjectContext] No projects on first fetch, retrying in 1.5s...');
                setTimeout(async () => {
                    await refreshProjects();
                }, 1500);
            }
        };

        fetchWithRetry();
    }, [isLoading, isAuthenticated, user, refreshProjects]);

    // ================================================
    // REAL-TIME SUBSCRIPTION
    // Listen for any changes to the projects table and sync local state.
    // This ensures all users see up-to-date data without manual refresh.
    // ================================================
    useEffect(() => {
        if (!isAuthenticated || !user) return;

        console.log('[ProjectContext] Setting up real-time subscription...');
        const channel = supabase
            .channel('projects-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'projects' },
                (payload: any) => {
                    console.log('[ProjectContext] Real-time event:', payload.eventType, payload.new?.id || payload.old?.id);

                    if (payload.eventType === 'UPDATE' && payload.new) {
                        try {
                            const updated = mapFromDb(payload.new);
                            setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
                        } catch (err) {
                            console.error('[ProjectContext] Error mapping real-time update:', err);
                        }
                    } else if (payload.eventType === 'INSERT' && payload.new) {
                        try {
                            const newProj = mapFromDb(payload.new);
                            setProjects(prev => {
                                // Avoid duplicates (e.g. if we already added it optimistically)
                                if (prev.some(p => p.id === newProj.id)) {
                                    return prev.map(p => p.id === newProj.id ? newProj : p);
                                }
                                return [newProj, ...prev];
                            });
                        } catch (err) {
                            console.error('[ProjectContext] Error mapping real-time insert:', err);
                        }
                    } else if (payload.eventType === 'DELETE' && payload.old) {
                        setProjects(prev => prev.filter(p => p.id !== payload.old.id));
                    }
                }
            )
            .subscribe((status: string) => {
                console.log('[ProjectContext] Real-time subscription status:', status);
            });

        return () => {
            console.log('[ProjectContext] Cleaning up real-time subscription');
            supabase.removeChannel(channel);
        };
    }, [isAuthenticated, user]);

    const getProject = useCallback((id: string) => {
        return projects.find(p => p.id === id);
    }, [projects]);

    const createProject = useCallback(async (data: Partial<Project>): Promise<Project | null> => {
        try {
            // Prepare initial pages with style name
            const initialPages: TechPackData[] = [JSON.parse(JSON.stringify(INITIAL_DATA))];
            if (initialPages[0]?.header && data.title) {
                initialPages[0].header.styleName = data.title;
            }

            // Build project data (without local ID - let backend generate it)
            const projectData: Partial<Project> = {
                title: data.title || 'New Style',
                poNumbers: data.poNumbers || [{ id: `po-${Date.now()}`, number: 'N/A' }],
                status: 'DRAFT',
                updatedAt: new Date().toISOString(),
                techPackFiles: data.techPackFiles || [],
                pages: data.pages || initialPages,
                comments: [],
                inspections: [],
                ppMeetings: [],
                materialControl: [],
                invoices: [],
                packing: createDefaultPacking(),
                materialRemarks: '',
                materialAttachments: [],
                materialComments: [],
                ...data,
            };

            // Call API first - backend will generate the real ID
            const { data: createdProject, error } = await projectService.createProject(projectData);
            if (error || !createdProject) {
                throw new Error(error || 'Failed to create project');
            }

            // Use the project returned by backend (with correct database ID)
            setProjects(prev => [createdProject, ...prev]);
            return createdProject;
        } catch (err: any) {
            console.error("Failed to create project:", err.message || err);
            return null;
        }
    }, []);

    const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
        console.log('[DB-SAVE-1] updateProject called:', { id, updateKeys: Object.keys(updates) });
        if (updates.techPackFiles) {
            console.log('[DB-SAVE-1] techPackFiles count:', updates.techPackFiles.length);
        }
        setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));

        try {
            const payload = {
                ...updates,
                updatedAt: new Date().toISOString()
            };
            console.log('[DB-SAVE-2] Sending to projectService.updateProject:', { id, payloadKeys: Object.keys(payload) });
            const { data, error } = await projectService.updateProject(id, payload);

            console.log('[DB-SAVE-3] Database response:', { data: data ? 'received' : 'null', error });
            if (data?.techPackFiles) {
                console.log('[DB-SAVE-3] Saved techPackFiles count:', data.techPackFiles.length);
            }

            if (error) {
                throw new Error(error);
            }
        } catch (err: any) {
            console.error("[DB-SAVE-ERR] Database update failed:", err.message || JSON.stringify(err));
        }
    }, []);

    const deleteProject = useCallback(async (id: string) => {
        try {
            await projectService.deleteProject(id);
            setProjects(prev => prev.filter(p => p.id !== id));
        } catch (err: any) {
            console.error("Delete failed:", err.message || err);
        }
    }, []);

    // Refresh a single project from the database (efficient single-row query)
    const refreshProject = useCallback(async (id: string) => {
        try {
            const { data: fresh, error } = await projectService.getProject(id);
            if (error) throw new Error(error);
            if (fresh) {
                setProjects(prev => prev.map(p => p.id === id ? fresh : p));
            }
        } catch (err: any) {
            console.error("[ProjectContext] Error refreshing project:", err.message || err);
        }
    }, []);

    const value: ProjectContextType = {
        projects,
        loading,
        getProject,
        createProject,
        updateProject,
        deleteProject,
        refreshProjects,
        refreshProject,
    };

    return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProjects = (): ProjectContextType => {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error('useProjects must be used within a ProjectProvider');
    }
    return context;
};

export default ProjectContext;
