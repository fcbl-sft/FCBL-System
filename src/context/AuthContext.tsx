/**
 * Auth Context - Manages user authentication state with Supabase Auth
 * Includes: profile data, section permissions, session timeout
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { User, UserRole, UserProfile, SectionId, SectionAccessLevel, SectionAccessMap } from '../../types';
import * as authService from '../services/authService';
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
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
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
        const initAuth = async () => {
            try {
                const currentUser = await authService.getCurrentUser();
                setUser(currentUser);

                if (currentUser) {
                    startSessionCheck();
                    authService.updateLastActivity();
                }
            } catch (err: any) {
                if (err.name === 'AbortError' || err.message?.includes('AbortError')) return;
                console.error('Auth initialization error:', err);
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();

        // Subscribe to auth changes
        const { data: { subscription } } = authService.onAuthStateChange((newUser) => {
            setUser(newUser);
            setIsLoading(false);

            if (newUser) {
                startSessionCheck();
                authService.updateLastActivity();
            } else {
                stopSessionCheck();
            }
        });

        return () => {
            subscription.unsubscribe();
            stopSessionCheck();
        };
    }, [startSessionCheck, stopSessionCheck]);

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
