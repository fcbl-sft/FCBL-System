/**
 * PP Meeting Content - Renders inside StyleLayout
 */
import React from 'react';
import { useParams } from 'react-router-dom';
import PPMeetingComponent from '../../components/PPMeeting';
import { useProjects } from '../context/ProjectContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { PPMeeting } from '../../types';

const PPMeetingContent: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { getProject, updateProject } = useProjects();

    const project = id ? getProject(id) : undefined;

    if (!project) return <LoadingSpinner message="Loading..." />;

    const handleUpdate = (meetings: PPMeeting[]) => {
        updateProject(project.id, { ppMeetings: meetings });
    };

    const noOp = () => { };

    return (
        <PPMeetingComponent
            project={project}
            onUpdate={handleUpdate}
            onBack={noOp}
        />
    );
};

export default PPMeetingContent;
