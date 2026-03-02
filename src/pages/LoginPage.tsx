/**
 * Login Page - Route wrapper for LoginScreen with auth integration
 */
import React, { useState, useCallback } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import LoginScreen from '../../components/LoginScreen';
import WelcomeScreen from '../components/WelcomeScreen';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import ROUTES from '../router/routes';
import LoadingSpinner from '../components/LoadingSpinner';

const LoginPage: React.FC = () => {
    useDocumentTitle('Login');
    const { isAuthenticated, isLoading, error, user, signIn, clearError } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    // Welcome screen state
    const [showWelcome, setShowWelcome] = useState(false);
    const [welcomeName, setWelcomeName] = useState('');

    // Show loading spinner during initial auth check
    if (isLoading && !showWelcome) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    // If already authenticated (e.g. page reload while logged in), go to dashboard
    if (isAuthenticated && !showWelcome) {
        const from = (location.state as any)?.from?.pathname || ROUTES.DASHBOARD;
        return <Navigate to={from} replace />;
    }

    const handleLogin = async (email: string, password: string): Promise<boolean> => {
        clearError();
        const result = await signIn(email, password);
        if (result.success) {
            // Show welcome screen instead of immediately navigating
            setWelcomeName(user?.fullName || email);
            setShowWelcome(true);
        }
        return result.success;
    };

    const handleWelcomeComplete = () => {
        const from = (location.state as any)?.from?.pathname || ROUTES.DASHBOARD;
        navigate(from, { replace: true });
    };

    const handleForgotPassword = () => {
        navigate(ROUTES.FORGOT_PASSWORD);
    };

    // Show welcome animation after successful login
    if (showWelcome) {
        return (
            <WelcomeScreen
                userName={welcomeName || user?.fullName || ''}
                onComplete={handleWelcomeComplete}
            />
        );
    }

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

