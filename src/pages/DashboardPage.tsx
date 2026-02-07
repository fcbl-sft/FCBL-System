/**
 * Dashboard Page - Main styles list
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from '../../components/Dashboard';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import ROUTES from '../router/routes';
import { Project, TechPackData } from '../../types';
import { INITIAL_DATA } from '../../constants';

const DashboardPage: React.FC = () => {
    useDocumentTitle('Dashboard');
    const navigate = useNavigate();
    const { userRole, logout } = useAuth();
    const { projects, createProject, updateProject, deleteProject } = useProjects();

    const handleSelectProject = (project: Project) => {
        navigate(ROUTES.TECH_PACK(project.id));
    };

    const handleCreateTechPack = () => {
        navigate(ROUTES.NEW_STYLE);
    };

    const handleUploadTechPack = async (file: File) => {
        const fileUrl = URL.createObjectURL(file);
        const newProject = await createProject({
            title: file.name,
            poNumbers: [{ id: 'default', number: 'N/A' }],
            pages: [JSON.parse(JSON.stringify(INITIAL_DATA))],
            techPackFiles: [{ id: `f-${Date.now()}`, name: 'PDF Import', fileUrl, uploadDate: new Date().toISOString() }],
        });

        if (newProject) {
            // Stay on dashboard after upload
        }
    };

    const handleLogout = () => {
        logout();
        navigate(ROUTES.LOGIN);
    };

    const handleManageInspection = (project: Project) => {
        navigate(ROUTES.INLINE_PHASE(project.id));
    };

    const handleManageInvoice = (project: Project) => {
        navigate(ROUTES.INVOICE(project.id));
    };

    const handleManagePacking = (project: Project) => {
        navigate(ROUTES.PACKING(project.id));
    };

    const handleManageOrderSheet = (project: Project) => {
        navigate(ROUTES.ORDER_SHEET(project.id));
    };

    const handleManageConsumption = (project: Project) => {
        navigate(ROUTES.CONSUMPTION(project.id));
    };

    const handleManageMaterialControl = (project: Project) => {
        navigate(ROUTES.MATERIALS(project.id));
    };

    const handleManagePPMeeting = (project: Project) => {
        navigate(ROUTES.PP_MEETING(project.id));
    };

    const handleDeleteProject = async (id: string) => {
        if (confirm("Delete this style?")) {
            await deleteProject(id);
        }
    };

    const handleRenameProject = (id: string, newTitle: string) => {
        updateProject(id, { title: newTitle });
    };

    const handleUpdateProject = (id: string, data: Partial<Project>) => {
        updateProject(id, data);
    };

    return (
        <Dashboard
            role={userRole!}
            projects={projects}
            onSelectProject={handleSelectProject}
            onCreateTechPack={handleCreateTechPack}
            onUploadTechPack={handleUploadTechPack}
            onLogout={handleLogout}
            onManageInspection={handleManageInspection}
            onManageInvoice={handleManageInvoice}
            onManagePacking={handleManagePacking}
            onManageOrderSheet={handleManageOrderSheet}
            onManageConsumption={handleManageConsumption}
            onManageMaterialControl={handleManageMaterialControl}
            onManagePPMeeting={handleManagePPMeeting}
            onDeleteProject={handleDeleteProject}
            onRenameProject={handleRenameProject}
            onUpdateProject={handleUpdateProject}
        />
    );
};

export default DashboardPage;
