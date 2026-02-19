/**
 * Section Guard - Wraps content with section-based access control
 * Use for granular permission checking within pages
 */
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { SectionId, SectionAccessLevel } from '../../types';

interface SectionGuardProps {
    children: React.ReactNode;
    /** Required section to access this content */
    section: SectionId;
    /** Minimum access level required (default: 'view') */
    requiredAccess?: SectionAccessLevel;
    /** Content to show if access denied (optional) */
    fallback?: React.ReactNode;
    /** If true, shows read-only indicator for view-only access */
    showViewOnlyBadge?: boolean;
}

/**
 * Guard component that checks section access before rendering children
 */
export const SectionGuard: React.FC<SectionGuardProps> = ({
    children,
    section,
    requiredAccess = 'view',
    fallback = null,
    showViewOnlyBadge = false,
}) => {
    const { hasAccess, isViewOnly } = useAuth();

    const hasRequiredAccess = hasAccess(section, requiredAccess);
    const viewOnly = isViewOnly(section);

    if (!hasRequiredAccess) {
        return <>{fallback}</>;
    }

    if (showViewOnlyBadge && viewOnly) {
        return (
            <div className="relative">
                <ViewOnlyBadge />
                {children}
            </div>
        );
    }

    return <>{children}</>;
};

/**
 * View-only badge component
 */
export const ViewOnlyBadge: React.FC = () => (
    <div
        className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1"
        style={{
            backgroundColor: '#FEF3C7',
            border: '1px solid #F59E0B',
            fontSize: '10px',
            fontWeight: 600,
            color: '#92400E',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
        }}
    >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
        </svg>
        View Only
    </div>
);

/**
 * Hook to check if a button/action should be hidden or disabled
 */
export function useActionAccess(section: SectionId) {
    const { hasAccess, isViewOnly } = useAuth();

    const canView = hasAccess(section, 'view');
    const canEdit = hasAccess(section, 'full');
    const viewOnly = isViewOnly(section);

    return {
        canView,
        canEdit,
        viewOnly,
        hideAction: !canEdit,
        disableAction: viewOnly,
    };
}

export default SectionGuard;
