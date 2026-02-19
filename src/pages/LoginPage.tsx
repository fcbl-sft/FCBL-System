/**
 * Login Page - Route wrapper for LoginScreen with auth integration
 */
import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import LoginScreen from '../../components/LoginScreen';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import ROUTES from '../router/routes';
import LoadingSpinner from '../components/LoadingSpinner';

const LoginPage: React.FC = () => {
    useDocumentTitle('Login');
    const { isAuthenticated, isLoading, error, signIn, clearError } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    // Show loading spinner during initial auth check
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    // Redirect to dashboard if already authenticated
    if (isAuthenticated) {
        const from = (location.state as any)?.from?.pathname || ROUTES.DASHBOARD;
        return <Navigate to={from} replace />;
    }

    const handleLogin = async (email: string, password: string): Promise<boolean> => {
        clearError();
        const result = await signIn(email, password);
        if (result.success) {
            const from = (location.state as any)?.from?.pathname || ROUTES.DASHBOARD;
            navigate(from, { replace: true });
        }
        return result.success;
    };

    const handleForgotPassword = () => {
        navigate(ROUTES.FORGOT_PASSWORD);
    };

    return (
        <LoginScreen
            onLogin={handleLogin}
            onForgotPassword={handleForgotPassword}
            error={error}
            isLoading={isLoading}
        />
    );
};

export default LoginPage;
