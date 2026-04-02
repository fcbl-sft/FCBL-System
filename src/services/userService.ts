/**
 * User Service - Admin user management operations
 */
import { supabase } from '../../lib/supabase';
import { UserProfile, UserRole, SectionAccessMap } from '../../types';
import { DEFAULT_ROLE_ACCESS } from '../constants/permissionConstants';

export interface CreateUserData {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    factory_id?: string;
    section_access?: Partial<SectionAccessMap>;
    phone?: string;
}

export interface UpdateUserData {
    name?: string;
    role?: UserRole;
    factory_id?: string;
    section_access?: SectionAccessMap;
    is_active?: boolean;
    phone?: string;
    profile_photo_url?: string;
}

/**
 * Get all users (Admin only)
 */
export async function getAllUsers(): Promise<UserProfile[]> {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Failed to fetch users:', error);
            return [];
        }

        return data as UserProfile[];
    } catch (err) {
        console.error('Get all users error:', err);
        return [];
    }
}

/**
 * Get a single user by ID
 */
export async function getUser(userId: string): Promise<UserProfile | null> {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) return null;
        return data as UserProfile;
    } catch {
        return null;
    }
}

/**
 * Create a new user (Admin only)
 * Uses Supabase Admin API via edge function or direct auth
 */
export async function createUser(userData: CreateUserData): Promise<{ user: UserProfile | null; error: string | null }> {
    try {
        // -------------------------------------------------------
        // 1. Capture the current admin session so we can restore it
        //    after supabase.auth.signUp (which signs in as the new user).
        // -------------------------------------------------------
        const { data: { session: adminSession } } = await supabase.auth.getSession();

        // -------------------------------------------------------
        // 2. Create the auth user via signUp
        //    supabase.auth.admin.createUser requires the service_role key
        //    which is NOT available on the client, so we always use signUp.
        // -------------------------------------------------------
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: userData.email,
            password: userData.password,
            options: {
                data: {
                    full_name: userData.name,
                    role: userData.role,
                },
            },
        });

        if (signUpError) {
            return { user: null, error: signUpError.message };
        }

        if (!signUpData.user) {
            return { user: null, error: 'Failed to create user' };
        }

        const newUserId = signUpData.user.id;

        // -------------------------------------------------------
        // 3. Restore admin session immediately
        //    signUp may have switched the active session to the new user.
        // -------------------------------------------------------
        if (adminSession) {
            await supabase.auth.setSession({
                access_token: adminSession.access_token,
                refresh_token: adminSession.refresh_token,
            });
        }

        // -------------------------------------------------------
        // 4. Create / update the profile
        //    The handle_new_user trigger may have already created a basic
        //    profile, so we upsert to set the correct role, name, etc.
        // -------------------------------------------------------
        const sectionAccess = userData.section_access
            ? { ...DEFAULT_ROLE_ACCESS[userData.role], ...userData.section_access }
            : DEFAULT_ROLE_ACCESS[userData.role];

        const { error: upsertError } = await supabase
            .from('profiles')
            .upsert({
                id: newUserId,
                email: userData.email,
                name: userData.name,
                role: userData.role,
                factory_id: userData.factory_id || null,
                section_access: sectionAccess,
                phone: userData.phone || null,
                is_active: true,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });

        if (upsertError) {
            console.error('Profile upsert error:', upsertError);
            // Still return success — the auth user was created
        }

        const profile = await getUser(newUserId);
        return { user: profile, error: null };
    } catch (err) {
        console.error('Create user error:', err);
        return { user: null, error: 'Failed to create user' };
    }
}

/**
 * Update an existing user (Admin only)
 * Uses Supabase RPC function (update_user_profile) with SECURITY DEFINER
 * to bypass RLS — no backend API needed.
 */
export async function updateUser(
    userId: string,
    updates: UpdateUserData
): Promise<{ success: boolean; error: string | null }> {
    try {
        // If role changed and no section_access override, apply role defaults
        let sectionAccess = updates.section_access;
        if (updates.role && !sectionAccess) {
            sectionAccess = DEFAULT_ROLE_ACCESS[updates.role];
        }

        const payload: Record<string, unknown> = {};
        if (updates.name !== undefined) payload.name = updates.name;
        if (updates.role !== undefined) payload.role = updates.role;
        if (updates.factory_id !== undefined) payload.factory_id = updates.factory_id;
        if (sectionAccess !== undefined) payload.section_access = sectionAccess;
        if (updates.is_active !== undefined) payload.is_active = updates.is_active;
        if (updates.phone !== undefined) payload.phone = updates.phone;
        if (updates.profile_photo_url !== undefined) payload.profile_photo_url = updates.profile_photo_url;

        // Call Supabase RPC function (bypasses RLS via SECURITY DEFINER)
        const { data, error } = await supabase.rpc('update_user_profile', {
            target_user_id: userId,
            updates: payload,
        });

        if (error) {
            console.error('Update user RPC error:', error);
            return { success: false, error: error.message };
        }

        // The RPC returns { success, error } as JSONB
        const result = data as { success: boolean; error: string | null } | null;
        if (result && !result.success) {
            return { success: false, error: result.error || 'Update failed' };
        }

        return { success: true, error: null };
    } catch (err) {
        console.error('Update user error:', err);
        return { success: false, error: 'Failed to update user' };
    }
}

/**
 * Delete a user (soft delete - set is_active to false)
 */
export async function deleteUser(userId: string): Promise<{ success: boolean; error: string | null }> {
    return updateUser(userId, { is_active: false });
}

/**
 * Toggle user active status
 */
export async function toggleUserActive(
    userId: string,
    isActive: boolean
): Promise<{ success: boolean; error: string | null }> {
    return updateUser(userId, { is_active: isActive });
}

/**
 * Send password reset email to user
 */
export async function resetUserPassword(email: string): Promise<{ success: boolean; error: string | null }> {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, error: null };
    } catch {
        return { success: false, error: 'Failed to send reset email' };
    }
}

/**
 * Get users by role
 */
export async function getUsersByRole(role: UserRole): Promise<UserProfile[]> {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', role)
            .order('name');

        if (error) return [];
        return data as UserProfile[];
    } catch {
        return [];
    }
}

/**
 * Search users by name or email
 */
export async function searchUsers(query: string): Promise<UserProfile[]> {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
            .order('name')
            .limit(50);

        if (error) return [];
        return data as UserProfile[];
    } catch {
        return [];
    }
}
