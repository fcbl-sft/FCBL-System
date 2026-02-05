/**
 * Materials Page - Route wrapper for MaterialControl
 */
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MaterialControl from '../../components/MaterialControl';
import { useProjects } from '../context/ProjectContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import LoadingSpinner from '../components/LoadingSpinner';
import NotFoundPage from './NotFoundPage';
import ROUTES from '../router/routes';
import { MaterialControlItem, Project } from '../../types';

const MaterialsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { getProject, updateProject } = useProjects();

    const project = id ? getProject(id) : undefined;
    useDocumentTitle(project ? `Materials - ${project.title}` : 'Materials');

    if (!id) return <NotFoundPage />;
    if (!project) return <LoadingSpinner message="Loading Materials..." />;

    const handleUpdateProject = (updates: Partial<Project>) => {
        updateProject(project.id, updates);
    };

    const handleUpdate = (items: MaterialControlItem[]) => {
        updateProject(project.id, { materialControl: items });
    };

    const handleBack = () => navigate(ROUTES.DASHBOARD);

    return (
        <MaterialControl
            project={project}
            onUpdateProject={handleUpdateProject}
            onUpdate={handleUpdate}
            onBack={handleBack}
        />
    );
};

export default MaterialsPage;
