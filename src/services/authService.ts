/**
 * Auth Service - Handles Supabase authentication operations with RBAC
 * Includes: account lockout, login activity logging, profile management, session timeout
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
    locked?: boolean;
    lockoutMinutes?: number;
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

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;
const SESSION_TIMEOUT_MINUTES = 30;

// Super Admin credentials
const SUPER_ADMIN_CREDENTIALS = {
    email: 'sft.salman94@gmail.com',
    password: '*#Salman042',
};

// Session activity storage key
const LAST_ACTIVITY_KEY = 'fcbl_last_activity';

// Super admin session cache key (persists across reloads)
const SUPER_ADMIN_SESSION_KEY = 'fcbl_super_admin_session';

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

// ================================================
// USER MAPPING
// ================================================

function mapSupabaseUser(supabaseUser: any, profile?: UserProfile | null): User {
    const metadata = supabaseUser.user_metadata || {};

    // Use profile data if available, otherwise fall back to metadata
    const role: UserRole = profile?.role || (metadata.role as UserRole) || 'viewer';
    const sectionAccess = profile?.section_access || DEFAULT_ROLE_ACCESS[role];

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
// ACCOUNT LOCKOUT FUNCTIONS
// ================================================

async function checkAccountLockout(email: string): Promise<{ locked: boolean; minutesRemaining?: number }> {
    try {
        const { data, error } = await supabase
            .from('account_lockouts')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

        if (error || !data) {
            return { locked: false };
        }

        if (data.locked_until) {
            const lockedUntil = new Date(data.locked_until);
            const now = new Date();

            if (lockedUntil > now) {
                const minutesRemaining = Math.ceil((lockedUntil.getTime() - now.getTime()) / (1000 * 60));
                return { locked: true, minutesRemaining };
            }
        }

        return { locked: false };
    } catch {
        return { locked: false };
    }
}

async function incrementFailedAttempts(email: string): Promise<{ locked: boolean; attempts: number }> {
    const normalizedEmail = email.toLowerCase();

    try {
        // Get current attempts
        const { data: existing } = await supabase
            .from('account_lockouts')
            .select('*')
            .eq('email', normalizedEmail)
            .single();

        const currentAttempts = existing?.failed_attempts || 0;
        const newAttempts = currentAttempts + 1;
        const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;

        const lockoutData = {
            email: normalizedEmail,
            failed_attempts: newAttempts,
            locked_until: shouldLock
                ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000).toISOString()
                : null,
            last_attempt: new Date().toISOString(),
        };

        await supabase
            .from('account_lockouts')
            .upsert(lockoutData, { onConflict: 'email' });

        return { locked: shouldLock, attempts: newAttempts };
    } catch (err) {
        console.error('Failed to track login attempts:', err);
        return { locked: false, attempts: 0 };
    }
}

async function resetFailedAttempts(email: string): Promise<void> {
    try {
        await supabase
            .from('account_lockouts')
            .delete()
            .eq('email', email.toLowerCase());
    } catch (err) {
        console.error('Failed to reset login attempts:', err);
    }
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
            timestamp: new Date().toISOString(),
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
// SESSION TIMEOUT
// ================================================

export function updateLastActivity(): void {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
}

export function hasSessionExpired(): boolean {
    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!lastActivity) return false;

    const lastActivityTime = parseInt(lastActivity, 10);
    const now = Date.now();
    const timeoutMs = SESSION_TIMEOUT_MINUTES * 60 * 1000;

    return (now - lastActivityTime) > timeoutMs;
}

export function clearSessionActivity(): void {
    localStorage.removeItem(LAST_ACTIVITY_KEY);
}

// ================================================
// AUTHENTICATION FUNCTIONS
// ================================================

export async function signIn(email: string, password: string): Promise<SignInResult> {
    // Check for Super Admin fallback credentials
    if (email === SUPER_ADMIN_CREDENTIALS.email && password === SUPER_ADMIN_CREDENTIALS.password) {
        // Log successful login
        await logLoginActivity(email, 'success', 'super-admin-001');
        await resetFailedAttempts(email);
        updateLastActivity();

        const superAdminAccess = DEFAULT_ROLE_ACCESS['super_admin'];

        const superAdminUser: User = {
            id: 'super-admin-001',
            email: SUPER_ADMIN_CREDENTIALS.email,
            fullName: 'Super Admin',
            role: 'super_admin',
            emailVerified: true,
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            sectionAccess: superAdminAccess,
        };

        // Persist super admin session to localStorage so it survives page reloads
        localStorage.setItem(SUPER_ADMIN_SESSION_KEY, JSON.stringify(superAdminUser));

        return {
            user: superAdminUser,
            error: null,
        };
    }

    // Check account lockout
    const lockoutStatus = await checkAccountLockout(email);
    if (lockoutStatus.locked) {
        await logLoginActivity(email, 'locked');
        return {
            user: null,
            error: `Account is temporarily locked. Please try again in ${lockoutStatus.minutesRemaining} minutes.`,
            locked: true,
            lockoutMinutes: lockoutStatus.minutesRemaining,
        };
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error || !data.user) {
            // Increment failed attempts
            const { locked, attempts } = await incrementFailedAttempts(email);
            await logLoginActivity(email, locked ? 'locked' : 'failed');

            if (locked) {
                return {
                    user: null,
                    error: `Too many failed attempts. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes.`,
                    locked: true,
                    lockoutMinutes: LOCKOUT_DURATION_MINUTES,
                };
            }

            const remaining = MAX_FAILED_ATTEMPTS - attempts;
            return {
                user: null,
                error: remaining > 0
                    ? `Invalid email or password. ${remaining} attempts remaining.`
                    : 'Invalid email or password',
            };
        }

        // Successful login - reset attempts and fetch profile
        await resetFailedAttempts(email);

        // Fetch user profile
        const profile = await getProfile(data.user.id);

        // Check if user is active
        if (profile && !profile.is_active) {
            await supabase.auth.signOut();
            await logLoginActivity(email, 'failed', data.user.id);
            return {
                user: null,
                error: 'Your account has been disabled. Please contact an administrator.',
            };
        }

        await logLoginActivity(email, 'success', data.user.id);
        updateLastActivity();

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
        clearSessionActivity();
        // Clear super admin session cache on logout
        localStorage.removeItem(SUPER_ADMIN_SESSION_KEY);
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

/**
 * Restore super admin session from localStorage (instant, no network call).
 * Returns the cached super admin user or null.
 */
export function getSuperAdminFromCache(): User | null {
    try {
        const cached = localStorage.getItem(SUPER_ADMIN_SESSION_KEY);
        if (cached) {
            return JSON.parse(cached) as User;
        }
    } catch {
        localStorage.removeItem(SUPER_ADMIN_SESSION_KEY);
    }
    return null;
}

export async function getCurrentUser(): Promise<User | null> {
    // First check for super admin cached session (instant, no network)
    const superAdmin = getSuperAdminFromCache();
    if (superAdmin) {
        return superAdmin;
    }

    try {
        // Use getSession() — reads from localStorage, no network call needed
        // This is much faster than getUser() which validates via network
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
            return null;
        }

        // Fetch profile (can be done in background; use cached metadata as fallback)
        const profile = await getProfile(session.user.id);

        return mapSupabaseUser(session.user, profile);
    } catch (err: any) {
        if (err.name === 'AbortError' || err.message?.includes('AbortError')) return null;
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
        // Validate password
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

export function onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
        // On sign out, also clear super admin cache
        if (event === 'SIGNED_OUT') {
            localStorage.removeItem(SUPER_ADMIN_SESSION_KEY);
            callback(null);
            return;
        }

        if (session?.user) {
            // For INITIAL_SESSION event, use quick session-based restore
            // Profile fetch happens async; mapSupabaseUser uses session metadata as fallback
            const profile = await getProfile(session.user.id);
            callback(mapSupabaseUser(session.user, profile));
        } else {
            callback(null);
        }
    });
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
            .order('timestamp', { ascending: false })
            .limit(limit);

        if (error) return [];
        return data as LoginActivity[];
    } catch {
        return [];
    }
}
