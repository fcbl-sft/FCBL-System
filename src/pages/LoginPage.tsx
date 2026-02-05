/**
 * Login Page - Route wrapper for LoginScreen
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import LoginScreen from '../../components/LoginScreen';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import ROUTES from '../router/routes';
import { UserRole } from '../../types';

const LoginPage: React.FC = () => {
    useDocumentTitle('Login');
    const { isAuthenticated, login } = useAuth();
    const location = useLocation();

    // Redirect to dashboard if already authenticated
    if (isAuthenticated) {
        const from = (location.state as any)?.from?.pathname || ROUTES.DASHBOARD;
        return <Navigate to={from} replace />;
    }

    const handleLogin = (role: UserRole) => {
        login(role);
    };

    return <LoginScreen onLogin={handleLogin} />;
};

export default LoginPage;
