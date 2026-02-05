/**
 * Packing Page - Route wrapper for PackingEditor
 */
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PackingEditor from '../../components/PackingEditor';
import { useProjects } from '../context/ProjectContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import LoadingSpinner from '../components/LoadingSpinner';
import NotFoundPage from './NotFoundPage';
import ROUTES from '../router/routes';
import { PackingInfo } from '../../types';

const PackingPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { getProject, updateProject } = useProjects();

    const project = id ? getProject(id) : undefined;
    useDocumentTitle(project ? `Packing List - ${project.title}` : 'Packing List');

    if (!id) return <NotFoundPage />;
    if (!project) return <LoadingSpinner message="Loading Packing List..." />;

    const handleUpdate = (packing: PackingInfo) => {
        updateProject(project.id, { packing });
    };

    const handleSave = () => { };
    const handleBack = () => navigate(ROUTES.DASHBOARD);

    return (
        <PackingEditor
            project={project}
            onUpdate={handleUpdate}
            onBack={handleBack}
            onSave={handleSave}
        />
    );
};

export default PackingPage;
