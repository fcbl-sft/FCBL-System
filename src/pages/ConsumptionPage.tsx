/**
 * Consumption Page - Route wrapper for ConsumptionEditor
 */
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ConsumptionEditor from '../../components/ConsumptionEditor';
import { useProjects } from '../context/ProjectContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import LoadingSpinner from '../components/LoadingSpinner';
import NotFoundPage from './NotFoundPage';
import ROUTES from '../router/routes';
import { ConsumptionData } from '../../types';

const ConsumptionPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { getProject, updateProject } = useProjects();

    const project = id ? getProject(id) : undefined;
    useDocumentTitle(project ? `Consumption - ${project.title}` : 'Consumption');

    if (!id) return <NotFoundPage />;
    if (!project) return <LoadingSpinner message="Loading Consumption..." />;

    const handleUpdate = (consumption: ConsumptionData) => {
        updateProject(project.id, { consumption });
    };

    const handleSave = () => {
        // Saving handled by handleUpdate
    };

    const handleBack = () => navigate(ROUTES.DASHBOARD);

    return (
        <ConsumptionEditor
            project={project}
            onUpdate={handleUpdate}
            onBack={handleBack}
            onSave={handleSave}
        />
    );
};

export default ConsumptionPage;
