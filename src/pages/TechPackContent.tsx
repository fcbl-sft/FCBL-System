/**
 * Tech Pack Content - Renders inside StyleLayout
 */
import React from 'react';
import { useParams } from 'react-router-dom';
import TechPackEditor from '../../components/TechPackEditor';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { Project, ProjectStatus } from '../../types';

const TechPackContent: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { userRole } = useAuth();
    const { getProject, updateProject } = useProjects();

    const project = id ? getProject(id) : undefined;

    if (!project) return <LoadingSpinner message="Loading..." />;

    const handleUpdateProject = (updatedProject: Project) => {
        // Send all modified fields — not just a fixed 4-field subset — so that
        // changes to pages, files, workflow, colors, etc. are all persisted.
        const { id: _id, createdAt: _createdAt, ...updates } = updatedProject;
        updateProject(project.id, updates);
    };

    const handleStatusChange = (newStatus: ProjectStatus) => {
        updateProject(project.id, { status: newStatus });
    };

    const handleAddComment = (text: string) => {
        const newComment = {
            id: `c-${Date.now()}`,
            author: userRole === 'admin' ? 'Admin' : 'User',
            role: userRole!,
            text,
            timestamp: new Date().toISOString()
        };
        updateProject(project.id, { comments: [...(project.comments || []), newComment] });
    };

    const noOp = () => { };

    return (
        <TechPackEditor
            project={project}
            currentUserRole={userRole!}
            onUpdateProject={handleUpdateProject}
            onBack={noOp}
            onStatusChange={handleStatusChange}
            onAddComment={handleAddComment}
        />
    );
};

export default TechPackContent;
