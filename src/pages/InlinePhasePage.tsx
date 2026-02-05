/**
 * Inline Phase (Inspection) Page - Route wrapper for InspectionEditor
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import InspectionEditor from '../../components/InspectionEditor';
import { useProjects } from '../context/ProjectContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import LoadingSpinner from '../components/LoadingSpinner';
import NotFoundPage from './NotFoundPage';
import ROUTES from '../router/routes';
import { Inspection, QCMeasurementRow, InspectionData } from '../../types';

// Helper to create default inspection
const createDefaultInspection = (projectId: string, styleName: string): Inspection => {
    const defaultRow: QCMeasurementRow = {
        id: 'row-1',
        point: 'A',
        name: 'Chest Width',
        tolerancePlus: '1.0',
        toleranceMinus: '1.0',
        groups: {},
        remarks: ''
    };

    const defaultData: InspectionData = {
        supplierName: '',
        supplierAddress: '',
        inspectionType: 'Inline',
        inspectorName: '',
        inspectionDate: new Date().toISOString().split('T')[0],
        buyerName: '',
        styleName: styleName,
        styleNumber: '',
        orderNumber: '',
        totalOrderQuantity: 0,
        refNumber: '',
        colorName: '',
        composition: '',
        gauges: '',
        weight: '',
        time: '',
        factoryName: '',
        factoryContact: '',
        countryOfProduction: '',
        shipmentGroups: [],
        measurementQty: 0,
        controlledQty: 0,
        attachments: [],
        qcDefects: [],
        qcSummary: { majorFound: 0, maxAllowed: 4, criticalMaxAllowed: 0, minorMaxAllowed: 10 },
        overallResult: 'PENDING',
        judgementComments: '',
        additionalComments: '',
        qcMeasurementTable: { groups: [], rows: [defaultRow] },
        globalMasterTolerance: '1.0',
        maxToleranceColorVariation: 0,
        measurementComments: '',
        images: [],
        visibleSections: ['generalInfo', 'orderDetails', 'shipment', 'qcDefects', 'judgement', 'images', 'measurements'],
        sectionComments: {}
    };

    return {
        id: `insp-${Date.now()}`,
        projectId,
        type: 'Inline',
        status: 'DRAFT',
        data: defaultData
    };
};

const InlinePhasePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { getProject, updateProject } = useProjects();
    const [activeInspectionId, setActiveInspectionId] = useState<string | null>(null);

    const project = id ? getProject(id) : undefined;
    useDocumentTitle(project ? `Inline Phase - ${project.title}` : 'Inline Phase');

    useEffect(() => {
        if (project) {
            if (project.inspections && project.inspections.length > 0) {
                setActiveInspectionId(project.inspections[project.inspections.length - 1].id);
            } else {
                const newInsp = createDefaultInspection(project.id, project.title);
                updateProject(project.id, { inspections: [newInsp] });
                setActiveInspectionId(newInsp.id);
            }
        }
    }, [project?.id]);

    if (!id) return <NotFoundPage />;
    if (!project) return <LoadingSpinner message="Loading Inspection..." />;

    const activeInspection = project.inspections?.find((i: Inspection) => i.id === activeInspectionId);
    if (!activeInspection) return <LoadingSpinner message="Initializing Inspection..." />;

    const handleUpdate = (inspection: Inspection) => {
        const updatedInspections = project.inspections.map((i: Inspection) =>
            i.id === inspection.id ? inspection : i
        );
        updateProject(project.id, { inspections: updatedInspections });
    };

    const handleSave = () => { };

    const handleDeleteInspection = (inspId: string) => {
        const updatedInspections = project.inspections.filter((i: Inspection) => i.id !== inspId);
        updateProject(project.id, { inspections: updatedInspections });
        navigate(ROUTES.DASHBOARD);
    };

    const handleBack = () => navigate(ROUTES.DASHBOARD);

    return (
        <InspectionEditor
            project={project}
            inspection={activeInspection}
            onUpdate={handleUpdate}
            onBack={handleBack}
            onSave={handleSave}
            onDeleteInspection={handleDeleteInspection}
        />
    );
};

export default InlinePhasePage;
