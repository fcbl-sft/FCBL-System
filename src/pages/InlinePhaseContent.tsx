/**
 * Inline Phase (QC Inspect) Content - Renders inside StyleLayout
 */
import React from 'react';
import { useParams } from 'react-router-dom';
import InspectionEditor from '../../components/InspectionEditor';
import { useProjects } from '../context/ProjectContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { Inspection } from '../../types';

const InlinePhaseContent: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { getProject, updateProject } = useProjects();

    const project = id ? getProject(id) : undefined;

    if (!project) return <LoadingSpinner message="Loading..." />;

    const getOrCreateInspection = (): Inspection => {
        if (project.inspections && project.inspections.length > 0) {
            return project.inspections[project.inspections.length - 1];
        }
        return {
            id: `insp-${Date.now()}`,
            projectId: project.id,
            type: 'QC Inspection',
            status: 'DRAFT',
            data: {
                supplierName: '',
                supplierAddress: '',
                inspectionType: '',
                inspectorName: '',
                inspectionDate: new Date().toISOString().split('T')[0],
                buyerName: '',
                styleName: project.title,
                styleNumber: '',
                orderNumber: project.poNumbers?.[0]?.number || '',
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
                qcSummary: { majorFound: 0, maxAllowed: 0, criticalMaxAllowed: 0, minorMaxAllowed: 0 },
                overallResult: 'PENDING',
                judgementComments: '',
                additionalComments: '',
                qcMeasurementTable: { groups: [], rows: [] },
                globalMasterTolerance: '0.5',
                maxToleranceColorVariation: 0,
                measurementComments: '',
                images: [],
                visibleSections: [],
                sectionComments: {}
            }
        };
    };

    const handleUpdate = (inspection: Inspection) => {
        const existingInspections = project.inspections || [];
        const existingIndex = existingInspections.findIndex(i => i.id === inspection.id);
        if (existingIndex >= 0) {
            const updatedInspections = [...existingInspections];
            updatedInspections[existingIndex] = inspection;
            updateProject(project.id, { inspections: updatedInspections });
        } else {
            updateProject(project.id, { inspections: [...existingInspections, inspection] });
        }
    };

    const handleDeleteInspection = (inspectionId: string) => {
        const updatedInspections = (project.inspections || []).filter(i => i.id !== inspectionId);
        updateProject(project.id, { inspections: updatedInspections });
    };

    const noOp = () => { };

    return (
        <InspectionEditor
            project={project}
            inspection={getOrCreateInspection()}
            onUpdate={handleUpdate}
            onBack={noOp}
            onSave={noOp}
            onDeleteInspection={handleDeleteInspection}
        />
    );
};

export default InlinePhaseContent;
