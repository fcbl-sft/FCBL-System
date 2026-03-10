/**
 * PP Meeting Page - Route wrapper for PPMeetingComponent
 */
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PPMeetingComponent from '../../components/PPMeeting';
import { useProjects } from '../context/ProjectContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import LoadingSpinner from '../components/LoadingSpinner';
import NotFoundPage from './NotFoundPage';
import ROUTES from '../router/routes';
import { PPMeeting } from '../../types';

const PPMeetingPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { getProject, updateProject } = useProjects();

    const project = id ? getProject(id) : undefined;
    useDocumentTitle(project ? `PP Meeting - ${project.title}` : 'PP Meeting');

    if (!id) return <NotFoundPage />;
    if (!project) return <LoadingSpinner message="Loading PP Meeting..." />;

    const handleUpdate = (meetings: PPMeeting[]) => {
        updateProject(project.id, { ppMeetings: meetings });
    };

    const handleBack = () => navigate(ROUTES.DASHBOARD);

    return (
        <PPMeetingComponent
            project={project}
            onUpdate={handleUpdate}
            onBack={handleBack}
        />
    );
};

export default PPMeetingPage;
