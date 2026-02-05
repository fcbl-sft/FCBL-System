/**
 * Breadcrumb Navigation Component
 */
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useProjects } from '../context/ProjectContext';
import ROUTES from '../router/routes';

interface BreadcrumbItem {
    label: string;
    path?: string;
}

const Breadcrumb: React.FC = () => {
    const location = useLocation();
    const { getProject } = useProjects();

    const getBreadcrumbs = (): BreadcrumbItem[] => {
        const path = location.pathname;
        const crumbs: BreadcrumbItem[] = [{ label: 'Dashboard', path: ROUTES.DASHBOARD }];

        // Extract style ID from path
        const styleMatch = path.match(/\/styles\/([^/]+)/);
        const styleId = styleMatch?.[1];
        const project = styleId ? getProject(styleId) : undefined;

        if (path.startsWith('/styles/') && styleId) {
            crumbs.push({ label: 'Active Styles', path: ROUTES.DASHBOARD });

            if (project) {
                crumbs.push({ label: project.title, path: ROUTES.TECH_PACK(styleId) });
            }

            // Add page-specific crumb
            if (path.includes('/order-sheet')) {
                crumbs.push({ label: 'Order Sheet' });
            } else if (path.includes('/consumption')) {
                crumbs.push({ label: 'Consumption' });
            } else if (path.includes('/pp-meeting')) {
                crumbs.push({ label: 'PP Meeting' });
            } else if (path.includes('/inline-phase')) {
                crumbs.push({ label: 'Inline Phase' });
            } else if (path.includes('/materials')) {
                crumbs.push({ label: 'Materials' });
            } else if (path.includes('/documents/invoice')) {
                crumbs.push({ label: 'Documents', path: ROUTES.TECH_PACK(styleId) });
                crumbs.push({ label: 'Invoice' });
            } else if (path.includes('/documents/packing')) {
                crumbs.push({ label: 'Documents', path: ROUTES.TECH_PACK(styleId) });
                crumbs.push({ label: 'Packing List' });
            } else if (!path.includes('/')) {
                crumbs.push({ label: 'Tech Pack' });
            }
        }

        return crumbs;
    };

    const breadcrumbs = getBreadcrumbs();

    if (breadcrumbs.length <= 1) return null;

    return (
        <nav className="flex items-center gap-2 text-sm text-gray-400 px-6 py-3 bg-gray-800/50">
            <Home size={14} className="text-gray-500" />
            {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                    {index > 0 && <ChevronRight size={14} className="text-gray-600" />}
                    {crumb.path && index < breadcrumbs.length - 1 ? (
                        <Link to={crumb.path} className="hover:text-white transition-colors">
                            {crumb.label}
                        </Link>
                    ) : (
                        <span className={index === breadcrumbs.length - 1 ? 'text-white' : ''}>
                            {crumb.label}
                        </span>
                    )}
                </React.Fragment>
            ))}
        </nav>
    );
};

export default Breadcrumb;
