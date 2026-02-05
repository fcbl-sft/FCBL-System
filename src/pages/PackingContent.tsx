/**
 * Packing Content - Renders inside StyleLayout
 */
import React from 'react';
import { useParams } from 'react-router-dom';
import PackingEditor from '../../components/PackingEditor';
import { useProjects } from '../context/ProjectContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { PackingInfo } from '../../types';

const PackingContent: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { getProject, updateProject } = useProjects();

    const project = id ? getProject(id) : undefined;

    if (!project) return <LoadingSpinner message="Loading..." />;

    const handleUpdate = (packing: PackingInfo) => {
        updateProject(project.id, { packing });
    };

    const noOp = () => { };

    return (
        <PackingEditor
            project={project}
            onUpdate={handleUpdate}
            onBack={noOp}
            onSave={noOp}
        />
    );
};

export default PackingContent;
