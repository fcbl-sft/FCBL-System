/**
 * Auth Context - Manages user authentication state with Supabase Auth
 * Includes: profile data, section permissions, session timeout
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { User, UserRole, UserProfile, SectionId, SectionAccessLevel, SectionAccessMap } from '../../types';
import * as authService from '../services/authService';
import { getSuperAdminFromCache, getSessionUserSync, clearAllAuthStorage } from '../services/authService';
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

// ================================================
// PROVIDER
// ================================================

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // ──────────────────────────────────────────────────────────
    // INSTANT SESSION RESTORE
    // Synchronously parse the JWT from localStorage to get a
    // User object BEFORE any async work.  If found, the app
    // renders immediately (loading=false).  The auth listener
    // and initAuth will enrich with full profile in background.
    // ──────────────────────────────────────────────────────────
    const cachedUser = getSessionUserSync();   // sync, ~0ms, no network

    const [user, setUser] = useState<User | null>(cachedUser);
    // If we have a cached user (super admin or valid JWT), no loading needed.
    // If no cached user but a raw session token exists, briefly show loading
    // while Supabase auto-refreshes the token.
    // If nothing at all, no loading — redirect to login.
    const [isLoading, setIsLoading] = useState(!cachedUser && !!(() => {
        try { return localStorage.getItem('fcbl-auth'); } catch { return null; }
    })());
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
        // `resolved` tracks whether loading has been resolved (by either
        // initAuth or the onAuthStateChange INITIAL_SESSION event).
        // If we already have a cachedUser from sync restore, we start resolved.
        const resolved = { current: !!cachedUser };

        // Safety timeout — only relevant when cachedUser is null and we're
        // waiting for an async session refresh. 15s allows for Vercel cold starts.
        const loadingTimeout = setTimeout(() => {
            if (mounted && !resolved.current) {
                console.warn('[Auth] Initialization timeout — stopping loading spinner.');
                resolved.current = true;
                // DON'T clear storage on timeout — the session may still be valid,
                // just slow to verify. Let the user retry or login fresh.
                setIsLoading(false);
            }
        }, 15000);

        // If already resolved (cachedUser found), clear the timeout immediately
        if (resolved.current) clearTimeout(loadingTimeout);

        const resolve = (newUser: User | null) => {
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
            // If we already have a cached user from the synchronous restore,
            // still fetch the full profile in the background to enrich user data
            // (e.g. section_access from DB profile), but DON'T block rendering.
            if (cachedUser) {
                try {
                    const fullUser = await authService.getCurrentUser();
                    if (mounted && fullUser) {
                        // Silently update user with full profile data
                        setUser(fullUser);
                        startSessionCheck();
                        authService.updateLastActivity();
                    } else if (mounted && !fullUser) {
                        // Session was invalid server-side — clear and redirect to login
                        console.warn('[Auth] Cached session invalid on server, clearing.');
                        clearAllAuthStorage();
                        setUser(null);
                    }
                } catch (err: any) {
                    // Background enrichment failed — keep using cached user.
                    // AbortError or network failure: session is likely still valid locally.
                    if (err?.name !== 'AbortError') {
                        console.warn('[Auth] Background profile fetch failed, using cached session:', err);
                    }
                }
                return;
            }

            // No cached user — rely on getSession / token refresh
            try {
                const currentUser = await authService.getCurrentUser();
                resolve(currentUser);
            } catch (err: any) {
                // AbortError: just ignore and let the flow continue
                if (err?.name === 'AbortError' || err?.message?.includes('AbortError')) {
                    console.warn('[Auth] Request aborted, ignoring.');
                    return;
                }
                console.error('[Auth] Initialization error:', err);
                if (mounted && !resolved.current) {
                    resolved.current = true;
                    clearTimeout(loadingTimeout);
                    // Don't clear storage — just stop loading
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
                // Already resolved; just keep user state in sync.
                // Don't overwrite a cached super admin with null from Supabase listener
                const isSuperAdmin = user?.id === 'super-admin-001' || cachedUser?.id === 'super-admin-001';
                if (isSuperAdmin && newUser === null) {
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
        // 1. Clear storage immediately (instant, no network)
        clearAllAuthStorage();
        stopSessionCheck();
        setUser(null);
        setIsLoading(false);

        // 2. Call Supabase signOut with timeout — don't block the UI
        try {
            const signOutPromise = authService.signOut();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('signOut timeout')), 3000)
            );
            await Promise.race([signOutPromise, timeoutPromise]);
        } catch (err) {
            // Timeout or error — doesn't matter, user is already logged out locally
            console.warn('Sign out API call failed or timed out:', err);
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
