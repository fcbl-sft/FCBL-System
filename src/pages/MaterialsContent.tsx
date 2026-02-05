/**
 * Materials Content - Renders inside StyleLayout
 */
import React from 'react';
import { useParams } from 'react-router-dom';
import MaterialControl from '../../components/MaterialControl';
import { useProjects } from '../context/ProjectContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { MaterialControlItem, Project } from '../../types';

const MaterialsContent: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { getProject, updateProject } = useProjects();

    const project = id ? getProject(id) : undefined;

    if (!project) return <LoadingSpinner message="Loading..." />;

    const handleUpdate = (items: MaterialControlItem[]) => {
        updateProject(project.id, { materialControl: items });
    };

    const handleProjectPartialUpdate = (updates: Partial<Project>) => {
        updateProject(project.id, updates);
    };

    const noOp = () => { };

    return (
        <MaterialControl
            project={project}
            onUpdateProject={handleProjectPartialUpdate}
            onUpdate={handleUpdate}
            onBack={noOp}
        />
    );
};

export default MaterialsContent;
