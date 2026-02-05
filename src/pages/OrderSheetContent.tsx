/**
 * Order Sheet Content - Renders inside StyleLayout
 */
import React from 'react';
import { useParams } from 'react-router-dom';
import OrderSheetEditor from '../../components/OrderSheetEditor';
import { useProjects } from '../context/ProjectContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { OrderSheet } from '../../types';

const OrderSheetContent: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { getProject, updateProject } = useProjects();

    const project = id ? getProject(id) : undefined;

    if (!project) return <LoadingSpinner message="Loading..." />;

    const handleUpdate = (orderSheet: OrderSheet) => {
        updateProject(project.id, { orderSheet });
    };

    const noOp = () => { };

    return (
        <OrderSheetEditor
            project={project}
            onUpdate={handleUpdate}
            onBack={noOp}
            onSave={noOp}
        />
    );
};

export default OrderSheetContent;
