/**
 * Order Sheet Page - Route wrapper for OrderSheetEditor
 */
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import OrderSheetEditor from '../../components/OrderSheetEditor';
import { useProjects } from '../context/ProjectContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import LoadingSpinner from '../components/LoadingSpinner';
import NotFoundPage from './NotFoundPage';
import ROUTES from '../router/routes';
import { OrderSheet } from '../../types';

const OrderSheetPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { getProject, updateProject } = useProjects();

    const project = id ? getProject(id) : undefined;
    useDocumentTitle(project ? `Order Sheet - ${project.title}` : 'Order Sheet');

    if (!id) return <NotFoundPage />;
    if (!project) return <LoadingSpinner message="Loading Order Sheet..." />;

    const handleUpdate = (orderSheet: OrderSheet) => {
        updateProject(project.id, { orderSheet });
    };

    const handleSave = () => {
        // Save is handled by handleUpdate
    };

    const handleBack = () => navigate(ROUTES.DASHBOARD);

    return (
        <OrderSheetEditor
            project={project}
            onUpdate={handleUpdate}
            onBack={handleBack}
            onSave={handleSave}
        />
    );
};

export default OrderSheetPage;
