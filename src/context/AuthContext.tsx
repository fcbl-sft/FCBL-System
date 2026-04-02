/**
 * Auth Context - Reliable session restore implementation
 *
 * Design principles:
 * - ALWAYS start with isLoading = true, user = null
 * - Initialize using getSession() — single, awaited call with no concurrency
 * - onAuthStateChange listener handles ONLY future events (SIGNED_IN after login,
 *   SIGNED_OUT, TOKEN_REFRESHED) — NOT the initial session restore
 * - ALWAYS fetch fresh profile from DB when a session exists
 * - NEVER use localStorage cache for user name/role (stale data)
 * - ONLY place for signOut is the logout action
 * - isLoading = false ONLY in the finally block of initialization
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { User, UserRole, UserProfile, SectionId, SectionAccessLevel, SectionAccessMap } from '../../types';
import * as authService from '../services/authService';
import { supabase } from '../../lib/supabase';
import { DEFAULT_ROLE_ACCESS, hasAccess, isViewOnly, canManageUsers, canManageRoles } from '../constants/permissionConstants';

// ================================================
// TYPES
// ================================================

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    userRole: UserRole | null;
    sectionAccess: SectionAccessMap | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    hasAccess: (section: SectionId, requiredLevel?: SectionAccessLevel) => boolean;
    isViewOnly: (section: SectionId) => boolean;
    canManageUsers: boolean;
    canManageRoles: boolean;
    signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<{ success: boolean; error: string | null }>;
    refreshProfile: () => Promise<void>;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ================================================
// HELPER: Build complete User object from auth + profile
// ================================================

function buildUser(authUser: any, profile: UserProfile): User {
    // Normalize role to lowercase — DB may store 'Admin', 'ADMIN', 'admin' etc.
    const rawRole = (profile.role || 'viewer').toLowerCase() as UserRole;
    const role = rawRole;
    let sectionAccess: SectionAccessMap = DEFAULT_ROLE_ACCESS[role] || DEFAULT_ROLE_ACCESS['viewer'];

    const rawAccess = profile.section_access;
    if (rawAccess && typeof rawAccess === 'object' && !Array.isArray(rawAccess)) {
        const validKeys = [
            'dashboard', 'summary', 'tech_pack', 'order_sheet', 'consumption',
            'pp_meeting', 'mq_control', 'commercial', 'qc_inspect',
            'user_management', 'role_management', 'admin',
        ];
        if (Object.keys(rawAccess).some(k => validKeys.includes(k))) {
            sectionAccess = rawAccess as SectionAccessMap;
        }
    }

    return {
        id: authUser.id,
        email: authUser.email || '',
        fullName: profile.name || authUser.email?.split('@')[0] || '',
        role,
        factoryName: profile.factory_id,
        emailVerified: !!authUser.email_confirmed_at,
        createdAt: authUser.created_at,
        lastLoginAt: authUser.last_sign_in_at,
        profile: profile,
        sectionAccess,
    };
}

// ================================================
// PROVIDER
// ================================================

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    // Flag: has the initial getSession() call completed?
    // Used to prevent the onAuthStateChange listener from re-processing the startup event.
    const initDoneRef = useRef(false);

    // Derived state
    const profile = user?.profile || null;
    const userRole = user?.role || null;
    const sectionAccess = user?.sectionAccess || (userRole ? DEFAULT_ROLE_ACCESS[userRole] : null);

    // ================================================
    // HELPER: fetch profile and set user state
    // ================================================

    const loadProfile = useCallback(async (authUser: any, setUserFn: typeof setUser) => {
        console.log('[Auth] Session found:', authUser.id);
        console.log('[Auth] Fetching profile from database...');

        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();

        if (profileError) {
            console.error('[Auth] Profile fetch error:', profileError.message);
        }

        if (profileData) {
            console.log('[Auth] Profile loaded:', profileData.name, '/', profileData.role);
            const completeUser = buildUser(authUser, profileData as UserProfile);
            setUserFn(completeUser);
            console.log('[Auth] User state set successfully');
        } else {
            console.warn('[Auth] No profile found for user:', authUser.id);
            setUserFn(null);
        }
    }, []);

    // ================================================
    // INITIALIZATION
    // ================================================

    useEffect(() => {
        let mounted = true;

        const initialize = async () => {
            console.log('[Auth] Initializing...');
            try {
                // getSession() reads from Supabase's internal localStorage store.
                // This is the safe, single call for restoring the session on mount.
                console.log('[Auth] Getting session...');
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    console.error('[Auth] Session error:', sessionError.message);
                    if (mounted) setUser(null);
                    return;
                }

                if (session?.user) {
                    await loadProfile(session.user, (u) => { if (mounted) setUser(u); });
                } else {
                    console.log('[Auth] No active session found');
                    if (mounted) setUser(null);
                }
            } catch (err: any) {
                console.error('[Auth] Initialization error:', err?.message || err);
                if (mounted) setUser(null);
            } finally {
                initDoneRef.current = true;
                if (mounted) {
                    setIsLoading(false);
                    console.log('[Auth] Loading complete');
                }
            }
        };

        initialize();

        // ================================================
        // LISTENER: handles FUTURE auth events only
        // (login, logout, token refresh — NOT the initial session restore)
        // ================================================
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`[Auth] State change: ${event}`);

            // Skip events that fire before/during initialization —
            // initialize() already handles the startup session.
            if (!initDoneRef.current) return;
            if (!mounted) return;

            if (event === 'SIGNED_OUT') {
                setUser(null);
            } else if (
                (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') &&
                session?.user
            ) {
                await loadProfile(session.user, (u) => { if (mounted) setUser(u); });
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [loadProfile]);

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

    const signIn = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await authService.signIn(email, password);

            if (result.error) {
                setError(result.error);
                return { success: false, error: result.error };
            }

            // authService.signIn already fetches the profile — result.user is complete
            setUser(result.user);
            return { success: true };
        } catch (err) {
            const msg = 'An unexpected error occurred during login.';
            setError(msg);
            return { success: false, error: msg };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const signOut = useCallback(async () => {
        setIsLoading(true);
        try {
            await authService.signOut();
            setUser(null);
        } catch (err) {
            console.error('[Auth] Sign out error:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const resetPassword = useCallback(async (email: string) => {
        const result = await authService.sendPasswordResetEmail(email);
        return { success: !result.error, error: result.error };
    }, []);

    const refreshProfile = useCallback(async () => {
        if (!user?.id) return;
        try {
            const profileData = await authService.getProfile(user.id);
            if (profileData) {
                setUser(prev => prev ? {
                    ...prev,
                    profile: profileData,
                    role: profileData.role as UserRole,
                    fullName: profileData.name,
                    sectionAccess: profileData.section_access as SectionAccessMap,
                } : null);
            }
        } catch (err) {
            console.error('[Auth] Refresh profile error:', err);
        }
    }, [user?.id]);

    const clearError = useCallback(() => setError(null), []);

    // ================================================
    // CONTEXT VALUE
    // ================================================

    const value: AuthContextType = {
        user,
        profile,
        userRole,
        sectionAccess,
        isAuthenticated: !!user,
        isLoading,
        error,
        hasAccess: checkAccess,
        isViewOnly: checkViewOnly,
        canManageUsers: userCanManageUsers,
        canManageRoles: userCanManageRoles,
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
