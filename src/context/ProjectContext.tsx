/**
 * Project Context - Manages projects state and CRUD operations
 */
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Project, Inspection, Invoice, PackingInfo, TechPackData, PPMeeting as PPMeetingType, ConsumptionData, OrderSheet } from '../../types';
import { projectService } from '../services/projectService';
import { INITIAL_DATA } from '../../constants';
import { useAuth } from './AuthContext';

interface ProjectContextType {
    projects: Project[];
    loading: boolean;
    getProject: (id: string) => Project | undefined;
    createProject: (data: Partial<Project>) => Promise<Project | null>;
    updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
    deleteProject: (id: string) => Promise<void>;
    refreshProjects: () => Promise<void>;
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
    const { isAuthenticated } = useAuth();

    const refreshProjects = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await projectService.getProjects();
            if (error) throw new Error(error);
            setProjects(data || []);
        } catch (err: any) {
            console.error("Error fetching projects:", err.message || err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            refreshProjects();
        }
    }, [isAuthenticated, refreshProjects]);

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
                createdAt: new Date().toISOString(),
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
        setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));

        try {
            const { error } = await projectService.updateProject(id, {
                ...updates,
                updatedAt: new Date().toISOString()
            });

            if (error) {
                throw new Error(error);
            }
        } catch (err: any) {
            console.error("Database update failed:", err.message || JSON.stringify(err));
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

    const value: ProjectContextType = {
        projects,
        loading,
        getProject,
        createProject,
        updateProject,
        deleteProject,
        refreshProjects,
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
