/**
 * Tech Pack Page - Route wrapper for TechPackEditor
 */
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TechPackEditor from '../../components/TechPackEditor';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import LoadingSpinner from '../components/LoadingSpinner';
import NotFoundPage from './NotFoundPage';
import ROUTES from '../router/routes';
import { Project, ProjectStatus } from '../../types';

const TechPackPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { userRole } = useAuth();
    const { getProject, updateProject } = useProjects();

    const project = id ? getProject(id) : undefined;
    useDocumentTitle(project ? `Tech Pack - ${project.title}` : 'Tech Pack');

    if (!id) return <NotFoundPage />;
    if (!project) return <LoadingSpinner message="Loading Tech Pack..." />;

    const handleUpdateProject = (updatedProject: Project) => {
        updateProject(project.id, updatedProject);
    };

    const handleStatusChange = (newStatus: ProjectStatus) => {
        updateProject(project.id, { status: newStatus });
    };

    const handleAddComment = (text: string) => {
        const newComment = {
            id: `c-${Date.now()}`,
            author: userRole === 'buyer' ? 'Buyer' : 'Supplier',
            role: userRole!,
            text,
            timestamp: new Date().toISOString()
        };
        updateProject(project.id, { comments: [...(project.comments || []), newComment] });
    };

    const handleBack = () => navigate(ROUTES.DASHBOARD);

    return (
        <TechPackEditor
            project={project}
            currentUserRole={userRole!}
            onUpdateProject={handleUpdateProject}
            onBack={handleBack}
            onStatusChange={handleStatusChange}
            onAddComment={handleAddComment}
        />
    );
};

export default TechPackPage;
