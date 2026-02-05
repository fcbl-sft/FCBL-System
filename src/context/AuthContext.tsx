/**
 * Auth Context - Manages user authentication state
 */
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { UserRole } from '../../types';

interface AuthContextType {
    userRole: UserRole | null;
    isAuthenticated: boolean;
    login: (role: UserRole) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [userRole, setUserRole] = useState<UserRole | null>(null);

    const login = useCallback((role: UserRole) => {
        setUserRole(role);
    }, []);

    const logout = useCallback(() => {
        setUserRole(null);
    }, []);

    const value: AuthContextType = {
        userRole,
        isAuthenticated: userRole !== null,
        login,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
