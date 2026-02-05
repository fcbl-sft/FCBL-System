/**
 * Consumption Content - Renders inside StyleLayout
 */
import React from 'react';
import { useParams } from 'react-router-dom';
import ConsumptionEditor from '../../components/ConsumptionEditor';
import { useProjects } from '../context/ProjectContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { ConsumptionData } from '../../types';

const ConsumptionContent: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { getProject, updateProject } = useProjects();

    const project = id ? getProject(id) : undefined;

    if (!project) return <LoadingSpinner message="Loading..." />;

    const handleUpdate = (consumption: ConsumptionData) => {
        updateProject(project.id, { consumption });
    };

    const noOp = () => { };

    return (
        <ConsumptionEditor
            project={project}
            onUpdate={handleUpdate}
            onBack={noOp}
            onSave={noOp}
        />
    );
};

export default ConsumptionContent;
