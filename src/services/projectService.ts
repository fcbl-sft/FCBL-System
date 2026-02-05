/**
 * Project/Style API service.
 * Replaces direct Supabase calls with FastAPI backend calls.
 */

import { api } from './api';
import { Project, PONumber } from '../../types';

// Response types matching backend
interface ProjectResponse {
    data: any;
    error: string | null;
}

/**
 * Normalize PO numbers from API response
 */
const normalizePONumbers = (pos: any): PONumber[] => {
    if (!Array.isArray(pos)) return [];
    return pos.map((p: any, idx: number) => {
        if (typeof p === 'string') return { id: `legacy-${idx}`, number: p };
        if (typeof p === 'object' && p.number) return p as PONumber;
        return { id: `unknown-${idx}`, number: 'N/A' };
    });
};

/**
 * Map API response to Project type (camelCase)
 */
const mapFromApi = (data: any): Project => ({
    id: data.id,
    title: data.title,
    productImage: data.productImage || undefined,
    productColors: data.productColors || [],
    poNumbers: normalizePONumbers(data.poNumbers),
    status: data.status,
    updatedAt: data.updatedAt,
    techPackFiles: data.techPackFiles || [],
    pages: data.pages || [],
    comments: data.comments || [],
    inspections: data.inspections || [],
    ppMeetings: data.ppMeetings || [],
    materialControl: data.materialControl || [],
    invoices: data.invoices || [],
    packing: data.packing || undefined,
    orderSheet: data.orderSheet || undefined,
    consumption: data.consumption || undefined,
    materialRemarks: data.materialRemarks || '',
    materialAttachments: data.materialAttachments || [],
    materialComments: data.materialComments || [],
});

/**
 * Map Project to API request (camelCase - backend handles conversion)
 */
const mapToApi = (proj: Partial<Project>): Record<string, any> => {
    const result: Record<string, any> = {};

    if (proj.id !== undefined) result.id = proj.id;
    if (proj.title !== undefined) result.title = proj.title;
    if (proj.productImage !== undefined) result.productImage = proj.productImage;
    if (proj.productColors !== undefined) result.productColors = proj.productColors;
    if (proj.status !== undefined) result.status = proj.status;
    if (proj.poNumbers !== undefined) result.poNumbers = proj.poNumbers;
    if (proj.updatedAt !== undefined) result.updatedAt = proj.updatedAt;
    if (proj.techPackFiles !== undefined) result.techPackFiles = proj.techPackFiles;
    if (proj.pages !== undefined) result.pages = proj.pages;
    if (proj.comments !== undefined) result.comments = proj.comments;
    if (proj.inspections !== undefined) result.inspections = proj.inspections;
    if (proj.ppMeetings !== undefined) result.ppMeetings = proj.ppMeetings;
    if (proj.materialControl !== undefined) result.materialControl = proj.materialControl;
    if (proj.invoices !== undefined) result.invoices = proj.invoices;
    if (proj.packing !== undefined) result.packing = proj.packing;
    if (proj.orderSheet !== undefined) result.orderSheet = proj.orderSheet;
    if (proj.consumption !== undefined) result.consumption = proj.consumption;
    if (proj.materialRemarks !== undefined) result.materialRemarks = proj.materialRemarks;
    if (proj.materialAttachments !== undefined) result.materialAttachments = proj.materialAttachments;
    if (proj.materialComments !== undefined) result.materialComments = proj.materialComments;

    return result;
};

/**
 * Project service for API operations
 */
export const projectService = {
    /**
     * Get all projects
     */
    async getProjects(): Promise<{ data: Project[] | null; error: string | null }> {
        const response = await api.get<any[]>('/styles');
        if (response.error) {
            return { data: null, error: response.error };
        }
        const projects = (response.data || []).map(mapFromApi);
        return { data: projects, error: null };
    },

    /**
     * Get a single project by ID
     */
    async getProject(id: string): Promise<{ data: Project | null; error: string | null }> {
        const response = await api.get<any>(`/styles/${id}`);
        if (response.error) {
            return { data: null, error: response.error };
        }
        return { data: mapFromApi(response.data), error: null };
    },

    /**
     * Create a new project
     */
    async createProject(data: Partial<Project>): Promise<{ data: Project | null; error: string | null }> {
        const response = await api.post<any>('/styles', mapToApi(data));
        if (response.error) {
            return { data: null, error: response.error };
        }
        return { data: mapFromApi(response.data), error: null };
    },

    /**
     * Update a project
     */
    async updateProject(id: string, data: Partial<Project>): Promise<{ data: Project | null; error: string | null }> {
        const response = await api.patch<any>(`/styles/${id}`, mapToApi(data));
        if (response.error) {
            return { data: null, error: response.error };
        }
        return { data: mapFromApi(response.data), error: null };
    },

    /**
     * Delete a project
     */
    async deleteProject(id: string): Promise<{ error: string | null }> {
        const response = await api.delete<any>(`/styles/${id}`);
        return { error: response.error };
    },
};

export default projectService;
