/**
 * Project/Style service using direct Supabase connection.
 * Bypasses the backend API for simpler deployment.
 */

import { supabase } from '../../lib/supabase';
import { Project, PONumber } from '../../types';

/**
 * Normalize PO numbers from database response
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
 * Map database row (snake_case) to Project type (camelCase)
 */
const mapFromDb = (row: any): Project => ({
    id: row.id,
    title: row.title,
    brand: row.brand || undefined,
    team: row.team || undefined,
    factoryName: row.factory_name || undefined,
    productImage: row.product_image || undefined,
    productColors: row.product_colors || [],
    poNumbers: normalizePONumbers(row.po_numbers),
    createdAt: row.created_at || undefined,
    status: row.status,
    updatedAt: row.updated_at,
    techPackFiles: row.tech_pack_files || [],
    pages: row.pages || [],
    comments: row.comments || [],
    inspections: row.inspections || [],
    ppMeetings: row.pp_meetings || [],
    materialControl: row.material_control || [],
    invoices: row.invoices || [],
    packing: row.packing || undefined,
    orderSheet: row.order_sheet || undefined,
    consumption: row.consumption || undefined,
    materialRemarks: row.material_remarks || '',
    materialAttachments: row.material_attachments || [],
    materialComments: row.material_comments || [],
    techPackWorkflow: row.tech_pack_workflow || undefined,
    mqControlWorkflow: row.mq_control_workflow || undefined,
    ppMeetingWorkflow: row.pp_meeting_workflow || undefined,
    commercialWorkflow: row.commercial_workflow || undefined,
    qcInspectWorkflow: row.qc_inspect_workflow || undefined,
    orderSheetWorkflow: row.order_sheet_workflow || undefined,
    consumptionWorkflow: row.consumption_workflow || undefined,
    packingWorkflow: row.packing_workflow || undefined,
});

/**
 * Map Project (camelCase) to database format (snake_case)
 */
const mapToDb = (proj: Partial<Project>): Record<string, any> => {
    const mapping: Record<string, string> = {
        factoryName: 'factory_name',
        poNumbers: 'po_numbers',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        techPackFiles: 'tech_pack_files',
        ppMeetings: 'pp_meetings',
        materialControl: 'material_control',
        orderSheet: 'order_sheet',
        materialRemarks: 'material_remarks',
        materialAttachments: 'material_attachments',
        materialComments: 'material_comments',
        productImage: 'product_image',
        productColors: 'product_colors',
        techPackWorkflow: 'tech_pack_workflow',
        mqControlWorkflow: 'mq_control_workflow',
        ppMeetingWorkflow: 'pp_meeting_workflow',
        commercialWorkflow: 'commercial_workflow',
        qcInspectWorkflow: 'qc_inspect_workflow',
        orderSheetWorkflow: 'order_sheet_workflow',
        consumptionWorkflow: 'consumption_workflow',
        packingWorkflow: 'packing_workflow',
        mainStatus: 'main_status',
    };

    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(proj)) {
        if (value !== undefined) {
            const dbKey = mapping[key] || key;
            result[dbKey] = value;
        }
    }
    return result;
};

/**
 * Project service for Supabase operations
 */
export const projectService = {
    /**
     * Get all projects
     */
    async getProjects(): Promise<{ data: Project[] | null; error: string | null }> {
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .order('updated_at', { ascending: false });

            if (error) {
                console.error('Supabase error:', error);
                return { data: null, error: error.message };
            }

            const projects = (data || []).map(mapFromDb);
            return { data: projects, error: null };
        } catch (err: any) {
            if (err.name === 'AbortError' || err.message?.includes('AbortError')) return { data: null, error: null };
            console.error('getProjects error:', err);
            return { data: null, error: err.message || 'Unknown error' };
        }
    },

    /**
     * Get a single project by ID
     */
    async getProject(id: string): Promise<{ data: Project | null; error: string | null }> {
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                return { data: null, error: error.message };
            }

            return { data: mapFromDb(data), error: null };
        } catch (err: any) {
            return { data: null, error: err.message || 'Unknown error' };
        }
    },

    /**
     * Create a new project
     */
    async createProject(projectData: Partial<Project>): Promise<{ data: Project | null; error: string | null }> {
        try {
            const projectId = `proj-${Date.now()}`;
            const now = new Date().toISOString();

            const dbData = mapToDb(projectData);
            dbData.id = projectId;
            dbData.updated_at = now;
            dbData.status = dbData.status || 'DRAFT';
            dbData.po_numbers = dbData.po_numbers || [];
            dbData.tech_pack_files = dbData.tech_pack_files || [];
            dbData.pages = dbData.pages || [];
            dbData.comments = dbData.comments || [];
            dbData.inspections = dbData.inspections || [];
            dbData.pp_meetings = dbData.pp_meetings || [];
            dbData.material_control = dbData.material_control || [];
            dbData.invoices = dbData.invoices || [];
            dbData.material_remarks = dbData.material_remarks || '';
            dbData.material_attachments = dbData.material_attachments || [];
            dbData.material_comments = dbData.material_comments || [];

            const { data, error } = await supabase
                .from('projects')
                .insert(dbData)
                .select()
                .single();

            if (error) {
                return { data: null, error: error.message };
            }

            return { data: mapFromDb(data), error: null };
        } catch (err: any) {
            return { data: null, error: err.message || 'Unknown error' };
        }
    },

    /**
     * Update a project
     */
    async updateProject(id: string, updates: Partial<Project>): Promise<{ data: Project | null; error: string | null }> {
        try {
            const dbData = mapToDb(updates);
            dbData.updated_at = new Date().toISOString();

            const { data, error } = await supabase
                .from('projects')
                .update(dbData)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                return { data: null, error: error.message };
            }

            return { data: mapFromDb(data), error: null };
        } catch (err: any) {
            return { data: null, error: err.message || 'Unknown error' };
        }
    },

    /**
     * Delete a project
     */
    async deleteProject(id: string): Promise<{ error: string | null }> {
        try {
            const { error } = await supabase
                .from('projects')
                .delete()
                .eq('id', id);

            if (error) {
                return { error: error.message };
            }

            return { error: null };
        } catch (err: any) {
            return { error: err.message || 'Unknown error' };
        }
    },
};

export default projectService;
