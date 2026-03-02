/**
 * Auth Context - Manages user authentication state with Supabase Auth
 * Includes: profile data, section permissions, session timeout
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { User, UserRole, UserProfile, SectionId, SectionAccessLevel, SectionAccessMap } from '../../types';
import * as authService from '../services/authService';
import { getSuperAdminFromCache } from '../services/authService';
import { DEFAULT_ROLE_ACCESS, hasAccess, isViewOnly, canManageUsers, canManageRoles } from '../constants/permissionConstants';

// ================================================
// TYPES
// ================================================

interface AuthContextType {
    // User state
    user: User | null;
    profile: UserProfile | null;
    userRole: UserRole | null;
    sectionAccess: SectionAccessMap | null;

    // Auth state
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // Permission checks
    hasAccess: (section: SectionId, requiredLevel?: SectionAccessLevel) => boolean;
    isViewOnly: (section: SectionId) => boolean;
    canManageUsers: boolean;
    canManageRoles: boolean;

    // Actions
    signIn: (email: string, password: string) => Promise<{ success: boolean; locked?: boolean; lockoutMinutes?: number }>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<{ success: boolean; error: string | null }>;
    refreshProfile: () => Promise<void>;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session timeout interval (check every minute)
const SESSION_CHECK_INTERVAL = 60 * 1000; // 1 minute

/**
 * Synchronously check whether any auth session token exists in localStorage.
 * Uses the storage key configured in supabase.ts (storageKey: 'fcbl-auth').
 * Returns true immediately — no network call needed.
 */
function hasCachedSession(): boolean {
    try {
        // Check for super admin cache
        if (localStorage.getItem('fcbl_super_admin_session')) return true;
        // Check for Supabase session token (key is storageKey used in createClient)
        // Supabase stores the session under the storageKey provided
        if (localStorage.getItem('fcbl-auth')) return true;
        // Fallback: scan for any sb-*-auth-token shaped key
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('sb-') && key.endsWith('-auth-token'))) return true;
        }
    } catch {
        // localStorage not accessible
    }
    return false;
}

// ================================================
// PROVIDER
// ================================================

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // ──────────────────────────────────────────────────────────
    // INSTANT SESSION RESTORE
    // Before any async work, synchronously check localStorage.
    // If a cached session token exists, initialize user from
    // super admin cache (or null) and set loading=false immediately
    // so the app renders without any delay on reload.
    // The auth state listener will then verify & update in background.
    // ──────────────────────────────────────────────────────────
    const cachedSuperAdmin = getSuperAdminFromCache();
    const sessionExists = hasCachedSession();

    const [user, setUser] = useState<User | null>(cachedSuperAdmin || null);
    // Loading state logic:
    //  - Super admin cached → no loading needed, user is immediately available
    //  - Regular Supabase session token exists → stay loading=true (resolves fast via getSession)
    //  - No session at all → no loading needed, user=null, will redirect to login
    const [isLoading, setIsLoading] = useState(!!cachedSuperAdmin ? false : sessionExists);
    const [error, setError] = useState<string | null>(null);
    const sessionCheckRef = useRef<NodeJS.Timeout | null>(null);

    // Derived state
    const profile = user?.profile || null;
    const userRole = user?.role || null;
    const sectionAccess = user?.sectionAccess || (userRole ? DEFAULT_ROLE_ACCESS[userRole] : null);

    // ================================================
    // SESSION TIMEOUT HANDLING
    // ================================================

    const handleSessionTimeout = useCallback(async () => {
        console.log('Session timeout - auto logout');
        await authService.signOut();
        setUser(null);
        setError('Your session has expired. Please sign in again.');
    }, []);

    const startSessionCheck = useCallback(() => {
        // Clear any existing interval
        if (sessionCheckRef.current) {
            clearInterval(sessionCheckRef.current);
        }

        // Start new interval
        sessionCheckRef.current = setInterval(() => {
            if (authService.hasSessionExpired()) {
                handleSessionTimeout();
            }
        }, SESSION_CHECK_INTERVAL);
    }, [handleSessionTimeout]);

    const stopSessionCheck = useCallback(() => {
        if (sessionCheckRef.current) {
            clearInterval(sessionCheckRef.current);
            sessionCheckRef.current = null;
        }
    }, []);

    // Track user activity to reset session timeout
    useEffect(() => {
        if (!user) return;

        const handleActivity = () => {
            authService.updateLastActivity();
        };

        // Track various user activities
        const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
        events.forEach(event => {
            window.addEventListener(event, handleActivity, { passive: true });
        });

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [user]);

    // ================================================
    // INITIALIZATION
    // ================================================

    useEffect(() => {
        let mounted = true;
        // `resolved` tracks whether loading has already been resolved (by either
        // initAuth or the onAuthStateChange INITIAL_SESSION event, whichever fires first).
        const resolved = { current: false };

        // Safety timeout: if auth still hasn't resolved after 5s, force-stop loading.
        const loadingTimeout = setTimeout(() => {
            if (mounted && !resolved.current) {
                console.warn('Auth initialization timed out — forcing loading to false.');
                resolved.current = true;
                setIsLoading(false);
            }
        }, 5000);

        const resolve = (newUser: ReturnType<typeof authService.getCurrentUser> extends Promise<infer T> ? T : never) => {
            if (!mounted || resolved.current) return;
            resolved.current = true;
            clearTimeout(loadingTimeout);
            setUser(newUser);
            setIsLoading(false);
            if (newUser) {
                startSessionCheck();
                authService.updateLastActivity();
            }
        };

        const initAuth = async () => {
            // If we already have a super admin cached, skip the async init entirely —
            // user is already set from the synchronous useState initializer above.
            if (cachedSuperAdmin) {
                resolve(cachedSuperAdmin);
                return;
            }
            try {
                const currentUser = await authService.getCurrentUser();
                resolve(currentUser);
            } catch (err: any) {
                if (err.name === 'AbortError' || err.message?.includes('AbortError')) return;
                console.error('Auth initialization error:', err);
                // Force-stop loading on any error so we never stay stuck
                if (mounted && !resolved.current) {
                    resolved.current = true;
                    clearTimeout(loadingTimeout);
                    setIsLoading(false);
                }
            }
        };

        initAuth();

        // Subscribe to auth state changes (also fires INITIAL_SESSION on mount)
        const { data: { subscription } } = authService.onAuthStateChange((newUser) => {
            if (!mounted) return;

            if (!resolved.current) {
                // Auth listener resolved before initAuth — use this result
                resolve(newUser);
            } else {
                // initAuth already resolved; just keep user state in sync
                // But: don't overwrite a cached super admin user with null from the
                // Supabase listener (super admin isn't in Supabase auth system)
                const isSuperAdmin = user?.id === 'super-admin-001' || cachedSuperAdmin?.id === 'super-admin-001';
                if (isSuperAdmin && newUser === null) {
                    // Super admin session is managed via localStorage, ignore Supabase null
                    return;
                }
                setUser(newUser);
                if (newUser) {
                    startSessionCheck();
                    authService.updateLastActivity();
                } else {
                    stopSessionCheck();
                }
            }
        });

        return () => {
            mounted = false;
            clearTimeout(loadingTimeout);
            subscription.unsubscribe();
            stopSessionCheck();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ================================================
    // PERMISSION CHECKS
    // ================================================

    const checkAccess = useCallback((section: SectionId, requiredLevel: SectionAccessLevel = 'view'): boolean => {
        return hasAccess(sectionAccess || undefined, section, requiredLevel);
    }, [sectionAccess]);

    const checkViewOnly = useCallback((section: SectionId): boolean => {
        return isViewOnly(sectionAccess || undefined, section);
    }, [sectionAccess]);

    const userCanManageUsers = userRole ? canManageUsers(userRole) : false;
    const userCanManageRoles = userRole ? canManageRoles(userRole) : false;

    // ================================================
    // ACTIONS
    // ================================================

    const signIn = useCallback(async (email: string, password: string): Promise<{ success: boolean; locked?: boolean; lockoutMinutes?: number }> => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await authService.signIn(email, password);

            if (result.error) {
                setError(result.error);
                setIsLoading(false);
                return {
                    success: false,
                    locked: result.locked,
                    lockoutMinutes: result.lockoutMinutes
                };
            }

            setUser(result.user);
            startSessionCheck();
            authService.updateLastActivity();
            setIsLoading(false);
            return { success: true };
        } catch (err) {
            setError('An unexpected error occurred');
            setIsLoading(false);
            return { success: false };
        }
    }, [startSessionCheck]);

    const signOut = useCallback(async () => {
        setIsLoading(true);
        try {
            stopSessionCheck();
            await authService.signOut();
            setUser(null);
        } catch (err) {
            console.error('Sign out error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [stopSessionCheck]);

    const resetPassword = useCallback(async (email: string) => {
        const result = await authService.sendPasswordResetEmail(email);
        return { success: !result.error, error: result.error };
    }, []);

    const refreshProfile = useCallback(async () => {
        if (!user?.id) return;

        try {
            const profile = await authService.getProfile(user.id);
            if (profile) {
                setUser(prev => prev ? {
                    ...prev,
                    profile,
                    role: profile.role,
                    fullName: profile.name,
                    sectionAccess: profile.section_access,
                } : null);
            }
        } catch (err) {
            console.error('Refresh profile error:', err);
        }
    }, [user?.id]);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // ================================================
    // CONTEXT VALUE
    // ================================================

    const value: AuthContextType = {
        // State
        user,
        profile,
        userRole,
        sectionAccess,
        isAuthenticated: user !== null,
        isLoading,
        error,

        // Permission checks
        hasAccess: checkAccess,
        isViewOnly: checkViewOnly,
        canManageUsers: userCanManageUsers,
        canManageRoles: userCanManageRoles,

        // Actions
        signIn,
        signOut,
        resetPassword,
        refreshProfile,
        clearError,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ================================================
// HOOK
// ================================================

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
