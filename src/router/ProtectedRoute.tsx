/**
 * Protected Route - Redirects to login if not authenticated
 * Includes section-based access control and role checking
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ROUTES from './routes';
import LoadingSpinner from '../components/LoadingSpinner';
import { SectionId, SectionAccessLevel, UserRole } from '../../types';

interface ProtectedRouteProps {
    children: React.ReactNode;
    /** Required role(s) to access this route */
    requiredRole?: UserRole | UserRole[];
    /** Required section access to view this route */
    requiredSection?: SectionId;
    /** Minimum access level required (default: 'view') */
    requiredAccess?: SectionAccessLevel;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    requiredRole,
    requiredSection,
    requiredAccess = 'view'
}) => {
    const { isAuthenticated, isLoading, userRole, hasAccess } = useAuth();
    const location = useLocation();

    // Show loading spinner while checking authentication
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
    }

    // Check role requirement
    if (requiredRole && userRole) {
        const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

        // Super admin can access everything
        if (userRole !== 'super_admin' && !allowedRoles.includes(userRole)) {
            return (
                <AccessDenied
                    message="You don't have permission to access this page."
                    requiredRole={allowedRoles}
                />
            );
        }
    }

    // Check section access requirement
    if (requiredSection) {
        const hasRequiredAccess = hasAccess(requiredSection, requiredAccess);

        if (!hasRequiredAccess) {
            return (
                <AccessDenied
                    message="You don't have permission to access this section."
                    requiredSection={requiredSection}
                />
            );
        }
    }

    return <>{children}</>;
};

// Access Denied component
interface AccessDeniedProps {
    message: string;
    requiredRole?: UserRole[];
    requiredSection?: SectionId;
}

const AccessDenied: React.FC<AccessDeniedProps> = ({ message }) => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center p-8 bg-white shadow-lg" style={{ maxWidth: '400px', border: '1px solid #E0E0E0' }}>
                <div
                    className="w-16 h-16 mx-auto mb-4 flex items-center justify-center"
                    style={{ backgroundColor: '#FEF2F2', borderRadius: '50%' }}
                >
                    <svg
                        className="w-8 h-8"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="#DC2626"
                        strokeWidth={2}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                </div>
                <h1
                    className="mb-2"
                    style={{
                        fontSize: '18px',
                        fontWeight: 700,
                        color: '#DC2626',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}
                >
                    Access Denied
                </h1>
                <p style={{ fontSize: '13px', color: '#666666', marginBottom: '24px' }}>
                    {message}
                </p>
                <a
                    href={ROUTES.DASHBOARD}
                    className="inline-block px-6 py-2 bg-black text-white text-xs uppercase tracking-wider hover:bg-gray-800 transition-colors"
                >
                    Go to Dashboard
                </a>
            </div>
        </div>
    );
};

export default ProtectedRoute;

// Export AccessDenied for use in other components
export { AccessDenied };
