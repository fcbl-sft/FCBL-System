/**
 * Style Layout - Shared layout with persistent header and tabs
 * Uses React Router's Outlet for nested route content
 */
import React, { useState } from 'react';
import { useParams, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { ArrowLeft, FileText, ShoppingCart, Scale, Users, Package, FileBox, ClipboardCheck, Edit3, Trash2, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import LoadingSpinner from '../components/LoadingSpinner';
import NotFoundPage from './NotFoundPage';
import ROUTES from '../router/routes';
import EditStyleModal from '../../components/EditStyleModal';
import DeleteStyleModal from '../../components/DeleteStyleModal';
import { Project } from '../../types';

type TabId = 'summary' | 'tech-pack' | 'order-sheet' | 'consumption' | 'pp-meeting' | 'mq-control' | 'commercial' | 'qc-inspect';

interface Tab {
    id: TabId;
    label: string;
    icon: React.ElementType;
    path: string;
}

const StyleLayout: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { userRole } = useAuth();
    const { getProject, updateProject, deleteProject } = useProjects();

    // Modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const project = id ? getProject(id) : undefined;
    useDocumentTitle(project ? `${project.title} - Style Detail` : 'Style Detail');

    // Define tabs with their paths
    const TABS: Tab[] = [
        { id: 'summary', label: 'Summary', icon: Home, path: `/styles/${id}` },
        { id: 'tech-pack', label: 'Tech Pack', icon: FileText, path: `/styles/${id}/tech-pack` },
        { id: 'order-sheet', label: 'Order Sheet', icon: ShoppingCart, path: `/styles/${id}/order-sheet` },
        { id: 'consumption', label: 'Consumption', icon: Scale, path: `/styles/${id}/consumption` },
        { id: 'pp-meeting', label: 'PP Meeting', icon: Users, path: `/styles/${id}/pp-meeting` },
        { id: 'mq-control', label: 'MQ Control', icon: Package, path: `/styles/${id}/materials` },
        { id: 'commercial', label: 'Commercial', icon: FileBox, path: `/styles/${id}/documents/invoice` },
        { id: 'qc-inspect', label: 'QC Inspect', icon: ClipboardCheck, path: `/styles/${id}/inline-phase` },
    ];

    // Derive active tab from current URL path
    const getActiveTabFromPath = (): TabId => {
        const path = location.pathname;
        if (path.includes('/tech-pack')) return 'tech-pack';
        if (path.includes('/order-sheet')) return 'order-sheet';
        if (path.includes('/consumption')) return 'consumption';
        if (path.includes('/pp-meeting')) return 'pp-meeting';
        if (path.includes('/materials')) return 'mq-control';
        if (path.includes('/documents/invoice') || path.includes('/documents/packing')) return 'commercial';
        if (path.includes('/inline-phase')) return 'qc-inspect';
        return 'summary';
    };
    const activeTab = getActiveTabFromPath();

    // Back button navigates to dashboard
    const handleBack = () => navigate(ROUTES.DASHBOARD);

    // Edit handlers
    const handleEditSave = async (updates: Partial<Project>) => {
        if (id) {
            await updateProject(id, updates);
            setShowEditModal(false);
        }
    };

    // Delete handlers
    const handleDeleteConfirm = async () => {
        if (id) {
            await deleteProject(id);
            setShowDeleteModal(false);
            navigate(ROUTES.DASHBOARD);
        }
    };

    if (!id) return <NotFoundPage />;
    if (!project) return <LoadingSpinner message="Loading Style..." />;

    // Status badge color
    const getStatusStyle = (status: string) => {
        const styles: Record<string, string> = {
            DRAFT: '#888888',
            SUBMITTED: '#666666',
            APPROVED: '#2D8A4E',
            ACCEPTED: '#2D8A4E',
            REJECTED: '#D32F2F',
            PENDING: '#F5A623',
        };
        return styles[status] || '#888888';
    };

    return (
        <div className="flex flex-col h-screen bg-white">
            {/* PERSISTENT HEADER */}
            <header className="bg-white px-6 py-4 flex items-center gap-4 shrink-0" style={{ borderBottom: '1px solid #E0E0E0' }}>
                <button
                    onClick={handleBack}
                    className="p-2 transition-colors"
                    style={{ color: '#000000' }}
                    title="Back to Dashboard"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-grow">
                    <h1 style={{ fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#000000' }}>
                        {project.title}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        {project.poNumbers?.slice(0, 3).map(po => (
                            <span
                                key={po.id}
                                style={{
                                    padding: '2px 8px',
                                    fontSize: '10px',
                                    fontWeight: 400,
                                    color: '#666666',
                                    border: '1px solid #E0E0E0'
                                }}
                            >
                                PO: {po.number}
                            </span>
                        ))}
                        {project.poNumbers && project.poNumbers.length > 3 && (
                            <span style={{ fontSize: '10px', color: '#888888' }}>+{project.poNumbers.length - 3} more</span>
                        )}
                    </div>
                </div>

                {/* Edit/Delete Buttons */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowEditModal(true)}
                        className="p-2 text-gray-600 hover:text-black hover:bg-gray-100 rounded transition-colors"
                        title="Edit Style"
                    >
                        <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setShowDeleteModal(true)}
                        className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Delete Style"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                <span
                    style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: getStatusStyle(project.status)
                    }}
                >
                    {project.status}
                </span>
            </header>

            {/* PERSISTENT TAB NAVIGATION */}
            <nav className="bg-white px-6 flex justify-center gap-0 shrink-0 overflow-x-auto" style={{ borderBottom: '1px solid #E0E0E0' }}>
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => navigate(tab.path)}
                            className="flex items-center gap-2 whitespace-nowrap transition-colors"
                            style={{
                                padding: '12px 16px',
                                fontSize: '11px',
                                fontWeight: isActive ? 700 : 400,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                color: isActive ? '#000000' : '#666666',
                                borderBottom: isActive ? '2px solid #000000' : '2px solid transparent',
                                background: 'transparent'
                            }}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </nav>

            {/* CONTENT AREA - Renders nested routes */}
            <main className="flex-grow overflow-hidden">
                <Outlet />
            </main>

            {/* Edit Modal */}
            {showEditModal && (
                <EditStyleModal
                    isOpen={true}
                    project={project}
                    onSave={handleEditSave}
                    onCancel={() => setShowEditModal(false)}
                />
            )}

            {/* Delete Modal */}
            {showDeleteModal && (
                <DeleteStyleModal
                    isOpen={true}
                    styleName={project.title}
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setShowDeleteModal(false)}
                />
            )}
        </div>
    );
};

export default StyleLayout;
