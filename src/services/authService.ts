/**
 * Auth Service - Handles Supabase authentication operations with RBAC
 * Includes: login activity logging, profile management
 */
import { supabase } from '../../lib/supabase';
import { User, UserRole, UserProfile, SectionAccessMap, LoginActivity } from '../../types';
import { DEFAULT_ROLE_ACCESS } from '../constants/permissionConstants';

// ================================================
// TYPES
// ================================================

export interface SignInResult {
    user: User | null;
    error: string | null;
}

export interface AuthError {
    message: string;
    code?: string;
}

// ================================================
// CONSTANTS
// ================================================

export const PASSWORD_REQUIREMENTS = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true,
};

// ================================================
// VALIDATION FUNCTIONS
// ================================================

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < PASSWORD_REQUIREMENTS.minLength) {
        errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`);
    }
    if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (PASSWORD_REQUIREMENTS.requireNumber && !/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    if (PASSWORD_REQUIREMENTS.requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }

    return { valid: errors.length === 0, errors };
}

export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function mapSupabaseUser(supabaseUser: any, profile?: UserProfile | null): User {
    const metadata = supabaseUser.user_metadata || {};

    // Use profile data if available, otherwise fall back to metadata
    // Normalize to lowercase — DB may store 'Admin', 'ADMIN' etc. but constants use 'admin'
    const rawRole = (profile?.role || metadata.role || 'viewer');
    const role: UserRole = (typeof rawRole === 'string' ? rawRole.toLowerCase() : 'viewer') as UserRole;

    // Validate section_access from the profile:
    // It MUST be a non-null object (not an array) with SectionId keys.
    // If it's null, undefined, empty, or wrong format → use role defaults.
    let sectionAccess = DEFAULT_ROLE_ACCESS[role] || DEFAULT_ROLE_ACCESS['viewer'];
    const rawAccess = profile?.section_access;

    if (rawAccess && typeof rawAccess === 'object' && !Array.isArray(rawAccess)) {
        const validKeys = ['dashboard', 'summary', 'tech_pack', 'order_sheet', 'consumption', 'pp_meeting', 'mq_control', 'commercial', 'qc_inspect', 'user_management', 'role_management'];
        const hasValidKey = Object.keys(rawAccess).some(k => validKeys.includes(k));
        if (hasValidKey) {
            sectionAccess = rawAccess;
        }
    }

    return {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        fullName: profile?.name || metadata.full_name || metadata.fullName || supabaseUser.email?.split('@')[0] || '',
        role,
        factoryName: profile?.factory_id || metadata.factory_name || metadata.factoryName,
        emailVerified: !!supabaseUser.email_confirmed_at,
        createdAt: supabaseUser.created_at,
        lastLoginAt: supabaseUser.last_sign_in_at,
        profile: profile || undefined,
        sectionAccess,
    };
}

// ================================================
// LOGIN ACTIVITY LOGGING
// ================================================

async function logLoginActivity(
    email: string,
    status: 'success' | 'failed' | 'locked',
    userId?: string
): Promise<void> {
    try {
        await supabase.from('login_activity').insert({
            user_id: userId || null,
            email: email.toLowerCase(),
            status,
            ip_address: null, // Would need server-side to get real IP
            user_agent: navigator.userAgent,
            created_at: new Date().toISOString(),
        });
    } catch (err) {
        console.error('Failed to log login activity:', err);
    }
}

// ================================================
// PROFILE MANAGEMENT
// ================================================

export async function getProfile(userId: string): Promise<UserProfile | null> {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !data) return null;

        return data as UserProfile;
    } catch {
        return null;
    }
}

export async function updateProfile(
    userId: string,
    updates: Partial<Pick<UserProfile, 'name' | 'phone' | 'profile_photo_url'>>
): Promise<{ success: boolean; error: string | null }> {
    try {
        const { error } = await supabase
            .from('profiles')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true, error: null };
    } catch (err) {
        return { success: false, error: 'Failed to update profile' };
    }
}

// ================================================
// AUTHENTICATION FUNCTIONS
// ================================================

export async function signIn(email: string, password: string): Promise<SignInResult> {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error || !data.user) {
            await logLoginActivity(email, 'failed');
            return {
                user: null,
                error: 'Invalid email or password',
            };
        }

        // Fetch user profile
        const profile = await getProfile(data.user.id);

        // Check if user is active
        if (profile && !profile.is_active) {
            await logLoginActivity(email, 'failed', data.user.id);
            return {
                user: null,
                error: 'Your account has been disabled. Please contact an administrator.',
            };
        }

        await logLoginActivity(email, 'success', data.user.id);

        return {
            user: mapSupabaseUser(data.user, profile),
            error: null,
        };
    } catch (err) {
        console.error('Sign in error:', err);
        return {
            user: null,
            error: 'An unexpected error occurred. Please try again.',
        };
    }
}

export async function signOut(): Promise<{ error: string | null }> {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            return { error: error.message };
        }
        return { error: null };
    } catch (err) {
        console.error('Sign out error:', err);
        return { error: 'Failed to sign out' };
    }
}

export async function getCurrentUser(): Promise<User | null> {
    try {
        // Use getSession() — reads from localStorage, no network call needed
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
            return null;
        }

        // Fetch profile (can be done in background; use cached metadata as fallback)
        const profile = await getProfile(session.user.id);

        return mapSupabaseUser(session.user, profile);
    } catch (err: any) {
        console.error('Get current user error:', err);
        return null;
    }
}

export async function getSession() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return session;
    } catch (err) {
        console.error('Get session error:', err);
        return null;
    }
}

export async function sendPasswordResetEmail(email: string): Promise<{ error: string | null }> {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        // Always return success for security (don't reveal if email exists)
        if (error) {
            console.error('Password reset error:', error);
        }

        return { error: null };
    } catch (err) {
        console.error('Password reset error:', err);
        return { error: null }; // Still return success for security
    }
}

export async function updatePassword(newPassword: string): Promise<{ error: string | null }> {
    try {
        const validation = validatePassword(newPassword);
        if (!validation.valid) {
            return { error: validation.errors[0] };
        }

        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (error) {
            return { error: error.message };
        }

        return { error: null };
    } catch (err) {
        console.error('Update password error:', err);
        return { error: 'Failed to update password' };
    }
}

// ================================================
// ADMIN USER MANAGEMENT (for userService)
// ================================================

export async function getAllProfiles(): Promise<UserProfile[]> {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Failed to fetch profiles:', error);
            return [];
        }

        return data as UserProfile[];
    } catch {
        return [];
    }
}

export async function updateUserProfile(
    userId: string,
    updates: Partial<UserProfile>
): Promise<{ success: boolean; error: string | null }> {
    try {
        const { error } = await supabase
            .from('profiles')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true, error: null };
    } catch {
        return { success: false, error: 'Failed to update user profile' };
    }
}

export async function toggleUserActive(
    userId: string,
    isActive: boolean
): Promise<{ success: boolean; error: string | null }> {
    return updateUserProfile(userId, { is_active: isActive });
}

// ================================================
// LOGIN ACTIVITY QUERIES
// ================================================

export async function getLoginActivity(limit: number = 100): Promise<LoginActivity[]> {
    try {
        const { data, error } = await supabase
            .from('login_activity')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) return [];
        return data as LoginActivity[];
    } catch {
        return [];
    }
}
