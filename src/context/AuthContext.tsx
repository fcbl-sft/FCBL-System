/**
 * Auth Context - Minimal Implementation with Emergency Bypass
 * Simple, reliable auth flow relying entirely on Supabase.
 * No timeouts, no aborts, no artificial lockouts.
 * Renders instantly using cached localStorage data.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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
// LOCAL STORAGE CACHE HELPERS
// ================================================

// Attempt to instantly read the cached Supabase user object from localStorage
const getCachedUser = (): User | null => {
    try {
        const stored = localStorage.getItem('fcbl-auth');
        if (stored) {
            const parsed = JSON.parse(stored);
            const rawUser = parsed?.user;
            if (rawUser) {
                // Return a minimal user object constructed from the cached session
                const metadata = rawUser.user_metadata || {};
                const role: UserRole = (metadata.role as UserRole) || 'viewer';
                const sectionAccess = DEFAULT_ROLE_ACCESS[role];

                return {
                    id: rawUser.id,
                    email: rawUser.email || '',
                    fullName: metadata.full_name || metadata.fullName || rawUser.email?.split('@')[0] || '',
                    role,
                    factoryName: metadata.factory_name || metadata.factoryName,
                    emailVerified: !!rawUser.email_confirmed_at,
                    createdAt: rawUser.created_at,
                    lastLoginAt: rawUser.last_sign_in_at,
                    sectionAccess,
                };
            }
        }
    } catch {
        return null; // Fail silently on format errors
    }
    return null;
};

// ================================================
// PROVIDER
// ================================================

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // 1. Instantly resolve user from cache
    const [user, setUser] = useState<User | null>(() => getCachedUser());
    
    // 2. NEVER start with loading=true. This bypassing rendering blocks.
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Derived state
    const profile = user?.profile || null;
    const userRole = user?.role || null;
    const sectionAccess = user?.sectionAccess || (userRole ? DEFAULT_ROLE_ACCESS[userRole] : null);

    // ================================================
    // INITIALIZATION & LISTENER (Background)
    // ================================================

    useEffect(() => {
        let mounted = true;

        const verifyAuthInBackground = async () => {
            try {
                // Verify auth behind the scenes, never blocking rendering
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                
                if (sessionError) {
                    console.error('[Auth] Background verify error:', sessionError);
                    // DO NOT clear user state on network error if we have a cache! Just fail silently.
                    return;
                }

                if (session?.user) {
                    const currentUser = await authService.getCurrentUser();
                    if (mounted) {
                        setUser(currentUser); // Upgrade to full user with profile if fetched successfully
                    }
                } else if (mounted) {
                    // No valid session on server -> Clear out the potentially stale cached user
                    setUser(null);
                }
            } catch (err) {
                console.error('[Auth] Background catch error:', err);
                // Fail silently, preserving cache
            }
        };

        // Start background verification
        verifyAuthInBackground();

        // Listen for future auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`[Auth] State change: ${event}`);
            
            if (!mounted) return;

            if (event === 'SIGNED_OUT') {
                setUser(null);
            } else if (session?.user) {
                const currentUser = await authService.getCurrentUser();
                if (mounted) {
                    setUser(currentUser);
                }
            } else {
                setUser(null);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
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

    const signIn = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await authService.signIn(email, password);

            if (result.error) {
                setError(result.error);
                setIsLoading(false);
                return { success: false, error: result.error };
            }

            setUser(result.user);
            setIsLoading(false);
            return { success: true };
        } catch (err) {
            setError('An unexpected error occurred during login.');
            setIsLoading(false);
            return { success: false, error: 'Unexpected error' };
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
