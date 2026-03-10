/**
 * Role Service - Super Admin role management operations
 */
import { supabase } from '../../lib/supabase';
import { RoleConfig, SectionAccessMap } from '../../types';

export interface CreateRoleData {
    name: string;
    description: string;
    default_sections: SectionAccessMap;
}

export interface UpdateRoleData {
    name?: string;
    description?: string;
    default_sections?: SectionAccessMap;
}

/**
 * Get all roles
 */
export async function getAllRoles(): Promise<RoleConfig[]> {
    try {
        const { data, error } = await supabase
            .from('roles')
            .select('*')
            .order('is_system', { ascending: false })
            .order('name');

        if (error) {
            console.error('Failed to fetch roles:', error);
            return [];
        }

        return data as RoleConfig[];
    } catch (err) {
        console.error('Get all roles error:', err);
        return [];
    }
}

/**
 * Get a single role by ID
 */
export async function getRole(roleId: string): Promise<RoleConfig | null> {
    try {
        const { data, error } = await supabase
            .from('roles')
            .select('*')
            .eq('id', roleId)
            .single();

        if (error) return null;
        return data as RoleConfig;
    } catch {
        return null;
    }
}

/**
 * Get a role by name
 */
export async function getRoleByName(name: string): Promise<RoleConfig | null> {
    try {
        const { data, error } = await supabase
            .from('roles')
            .select('*')
            .eq('name', name)
            .single();

        if (error) return null;
        return data as RoleConfig;
    } catch {
        return null;
    }
}

/**
 * Create a new custom role (Super Admin only)
 */
export async function createRole(roleData: CreateRoleData): Promise<{ role: RoleConfig | null; error: string | null }> {
    try {
        // Check if role name already exists
        const existing = await getRoleByName(roleData.name);
        if (existing) {
            return { role: null, error: 'A role with this name already exists' };
        }

        const { data, error } = await supabase
            .from('roles')
            .insert({
                name: roleData.name.toLowerCase().replace(/\s+/g, '_'),
                description: roleData.description,
                default_sections: roleData.default_sections,
                is_system: false,
                created_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) {
            return { role: null, error: error.message };
        }

        return { role: data as RoleConfig, error: null };
    } catch (err) {
        console.error('Create role error:', err);
        return { role: null, error: 'Failed to create role' };
    }
}

/**
 * Update an existing role (Super Admin only)
 */
export async function updateRole(
    roleId: string,
    updates: UpdateRoleData
): Promise<{ success: boolean; error: string | null }> {
    try {
        // Check if role is system role
        const role = await getRole(roleId);
        if (!role) {
            return { success: false, error: 'Role not found' };
        }

        // For system roles, only allow updating description and default_sections
        const updateData: any = {};

        if (role.is_system) {
            if (updates.description !== undefined) updateData.description = updates.description;
            if (updates.default_sections !== undefined) updateData.default_sections = updates.default_sections;
        } else {
            if (updates.name !== undefined) updateData.name = updates.name.toLowerCase().replace(/\s+/g, '_');
            if (updates.description !== undefined) updateData.description = updates.description;
            if (updates.default_sections !== undefined) updateData.default_sections = updates.default_sections;
        }

        if (Object.keys(updateData).length === 0) {
            return { success: true, error: null };
        }

        const { error } = await supabase
            .from('roles')
            .update(updateData)
            .eq('id', roleId);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, error: null };
    } catch (err) {
        console.error('Update role error:', err);
        return { success: false, error: 'Failed to update role' };
    }
}

/**
 * Delete a custom role (Super Admin only)
 * Cannot delete system roles
 */
export async function deleteRole(roleId: string): Promise<{ success: boolean; error: string | null }> {
    try {
        // Check if role is system role
        const role = await getRole(roleId);
        if (!role) {
            return { success: false, error: 'Role not found' };
        }

        if (role.is_system) {
            return { success: false, error: 'Cannot delete system roles' };
        }

        // Check if any users have this role
        const { data: usersWithRole } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', role.name)
            .limit(1);

        if (usersWithRole && usersWithRole.length > 0) {
            return { success: false, error: 'Cannot delete role that is assigned to users' };
        }

        const { error } = await supabase
            .from('roles')
            .delete()
            .eq('id', roleId);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, error: null };
    } catch (err) {
        console.error('Delete role error:', err);
        return { success: false, error: 'Failed to delete role' };
    }
}
