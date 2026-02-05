/**
 * Style Detail Page - Full style view with all sections as tabs
 */
import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, FileText, ShoppingCart, Scale, Users, Package, FileBox, ClipboardCheck } from 'lucide-react';
import TechPackEditor from '../../components/TechPackEditor';
import OrderSheetEditor from '../../components/OrderSheetEditor';
import ConsumptionEditor from '../../components/ConsumptionEditor';
import PPMeetingComponent from '../../components/PPMeeting';
import MaterialControl from '../../components/MaterialControl';
import InvoiceEditor from '../../components/InvoiceEditor';
import PackingEditor from '../../components/PackingEditor';
import InspectionEditor from '../../components/InspectionEditor';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import LoadingSpinner from '../components/LoadingSpinner';
import NotFoundPage from './NotFoundPage';
import ROUTES from '../router/routes';
import { Project, ProjectStatus, OrderSheet, ConsumptionData, PPMeeting, MaterialControlItem, Invoice, PackingInfo, Inspection, FileAttachment, Comment } from '../../types';

type TabId = 'tech-pack' | 'order-sheet' | 'consumption' | 'pp-meeting' | 'mq-control' | 'commercial' | 'qc-inspect';

interface Tab {
    id: TabId;
    label: string;
    icon: React.ElementType;
}

const TABS: Tab[] = [
    { id: 'tech-pack', label: 'Tech Pack', icon: FileText },
    { id: 'order-sheet', label: 'Order Sheet', icon: ShoppingCart },
    { id: 'consumption', label: 'Consumption', icon: Scale },
    { id: 'pp-meeting', label: 'PP Meeting', icon: Users },
    { id: 'mq-control', label: 'MQ Control', icon: Package },
    { id: 'commercial', label: 'Commercial', icon: FileBox },
    { id: 'qc-inspect', label: 'QC Inspect', icon: ClipboardCheck },
];

const StyleDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { userRole } = useAuth();
    const { getProject, updateProject } = useProjects();

    // Derive active tab from current URL path (not state)
    const getActiveTabFromPath = (): TabId => {
        const path = location.pathname;
        if (path.includes('/order-sheet')) return 'order-sheet';
        if (path.includes('/consumption')) return 'consumption';
        if (path.includes('/pp-meeting')) return 'pp-meeting';
        if (path.includes('/materials')) return 'mq-control';
        if (path.includes('/documents/invoice') || path.includes('/documents/packing')) return 'commercial';
        if (path.includes('/inline-phase')) return 'qc-inspect';
        return 'tech-pack';  // Default for /styles/:id
    };
    const activeTab = getActiveTabFromPath();

    // Derive commercial sub-tab from URL
    const commercialSubTab: 'invoice' | 'packing' = location.pathname.includes('/documents/packing') ? 'packing' : 'invoice';

    const project = id ? getProject(id) : undefined;
    useDocumentTitle(project ? `${project.title} - Style Detail` : 'Style Detail');

    if (!id) return <NotFoundPage />;
    if (!project) return <LoadingSpinner message="Loading Style..." />;

    const handleBack = () => navigate(ROUTES.DASHBOARD);

    // Tech Pack handlers
    const handleUpdateProject = (updatedProject: Project) => {
        updateProject(project.id, updatedProject);
    };

    const handleStatusChange = (newStatus: ProjectStatus) => {
        updateProject(project.id, { status: newStatus });
    };

    const handleAddComment = (text: string) => {
        const newComment = {
            id: `c-${Date.now()}`,
            author: userRole === 'buyer' ? 'Buyer' : 'Supplier',
            role: userRole!,
            text,
            timestamp: new Date().toISOString()
        };
        updateProject(project.id, { comments: [...(project.comments || []), newComment] });
    };

    // Order Sheet handlers
    const handleOrderSheetUpdate = (orderSheet: OrderSheet) => {
        updateProject(project.id, { orderSheet });
    };

    // Consumption handlers
    const handleConsumptionUpdate = (consumption: ConsumptionData) => {
        updateProject(project.id, { consumption });
    };

    // PP Meeting handlers - expects array
    const handlePPMeetingsUpdate = (meetings: PPMeeting[]) => {
        updateProject(project.id, { ppMeetings: meetings });
    };

    // Material Control handlers
    const handleMaterialControlUpdate = (items: MaterialControlItem[]) => {
        updateProject(project.id, { materialControl: items });
    };

    const handleProjectPartialUpdate = (updates: Partial<Project>) => {
        updateProject(project.id, updates);
    };

    // Invoice handlers
    const handleInvoiceUpdate = (invoice: Invoice) => {
        const existingInvoices = project.invoices || [];
        const existingIndex = existingInvoices.findIndex(i => i.id === invoice.id);
        if (existingIndex >= 0) {
            const updatedInvoices = [...existingInvoices];
            updatedInvoices[existingIndex] = invoice;
            updateProject(project.id, { invoices: updatedInvoices });
        } else {
            updateProject(project.id, { invoices: [...existingInvoices, invoice] });
        }
    };

    // Packing handlers
    const handlePackingUpdate = (packing: PackingInfo) => {
        updateProject(project.id, { packing });
    };

    // QC Inspection handlers
    const handleInspectionUpdate = (inspection: Inspection) => {
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

    const getOrCreateInvoice = (): Invoice => {
        if (project.invoices && project.invoices.length > 0) {
            return project.invoices[project.invoices.length - 1];
        }
        return {
            id: `inv-${Date.now()}`,
            invoiceNo: '',
            invoiceDate: new Date().toISOString().split('T')[0],
            expNo: '',
            expDate: '',
            scNo: '',
            scDate: '',
            shipperName: '',
            shipperAddress: '',
            buyerName: '',
            buyerAddress: '',
            buyerVatId: '',
            consigneeName: '',
            consigneeAddress: '',
            notifyParty1Name: '',
            notifyParty1Address: '',
            notifyParty1Phone: '',
            notifyParty1Contact: '',
            notifyParty1Email: '',
            notifyParty2Name: '',
            notifyParty2Address: '',
            bankName: '',
            bankBranch: '',
            bankSwift: '',
            bankAccountNo: '',
            exportRegNo: '',
            exportRegDate: '',
            portOfLoading: '',
            finalDestination: '',
            paymentTerms: '',
            modeOfShipment: '',
            blNo: '',
            blDate: '',
            countryOfOrigin: '',
            lineItems: [],
            netWeight: 0,
            grossWeight: 0,
            totalCbm: 0,
            rexDeclaration: '',
            attachments: [],
            status: 'DRAFT'
        };
    };

    // Empty callback - save is auto-handled
    const noOp = () => { };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'tech-pack':
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

            case 'order-sheet':
                return (
                    <OrderSheetEditor
                        project={project}
                        onUpdate={handleOrderSheetUpdate}
                        onBack={noOp}
                        onSave={noOp}
                    />
                );

            case 'consumption':
                return (
                    <ConsumptionEditor
                        project={project}
                        onUpdate={handleConsumptionUpdate}
                        onBack={noOp}
                        onSave={noOp}
                    />
                );

            case 'pp-meeting':
                return (
                    <PPMeetingComponent
                        project={project}
                        onUpdate={handlePPMeetingsUpdate}
                        onBack={noOp}
                    />
                );

            case 'mq-control':
                return (
                    <MaterialControl
                        project={project}
                        onUpdateProject={handleProjectPartialUpdate}
                        onUpdate={handleMaterialControlUpdate}
                        onBack={noOp}
                    />
                );

            case 'commercial':
                return (
                    <div className="flex flex-col h-full">
                        {/* Commercial Sub-tabs - Inditex style */}
                        <div className="bg-white px-6 py-0 flex gap-0" style={{ borderBottom: '1px solid #E0E0E0' }}>
                            <button
                                onClick={() => navigate(`/styles/${id}/documents/invoice`)}
                                style={{
                                    padding: '12px 16px',
                                    fontSize: '11px',
                                    fontWeight: commercialSubTab === 'invoice' ? 700 : 400,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    color: commercialSubTab === 'invoice' ? '#000000' : '#666666',
                                    borderBottom: commercialSubTab === 'invoice' ? '2px solid #000000' : '2px solid transparent',
                                    background: 'transparent'
                                }}
                            >
                                Invoice
                            </button>
                            <button
                                onClick={() => navigate(`/styles/${id}/documents/packing`)}
                                style={{
                                    padding: '12px 16px',
                                    fontSize: '11px',
                                    fontWeight: commercialSubTab === 'packing' ? 700 : 400,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    color: commercialSubTab === 'packing' ? '#000000' : '#666666',
                                    borderBottom: commercialSubTab === 'packing' ? '2px solid #000000' : '2px solid transparent',
                                    background: 'transparent'
                                }}
                            >
                                Packing List
                            </button>
                        </div>
                        <div className="flex-grow overflow-hidden">
                            {commercialSubTab === 'invoice' ? (
                                <InvoiceEditor
                                    project={project}
                                    invoice={getOrCreateInvoice()}
                                    onUpdate={handleInvoiceUpdate}
                                    onBack={noOp}
                                    onSave={noOp}
                                />
                            ) : (
                                <PackingEditor
                                    project={project}
                                    onUpdate={handlePackingUpdate}
                                    onBack={noOp}
                                    onSave={noOp}
                                />
                            )}
                        </div>
                    </div>
                );

            case 'qc-inspect':
                return (
                    <InspectionEditor
                        project={project}
                        inspection={getOrCreateInspection()}
                        onUpdate={handleInspectionUpdate}
                        onBack={noOp}
                        onSave={noOp}
                        onDeleteInspection={handleDeleteInspection}
                    />
                );

            default:
                return null;
        }
    };

    // Status badge styles - Inditex style (text only, no background)
    const getStatusStyle = (status: string) => {
        const styles: Record<string, string> = {
            DRAFT: '#888888',
            SUBMITTED: '#666666',
            APPROVED: '#2D8A4E',
            ACCEPTED: '#2D8A4E',
            REJECTED: '#D32F2F',
            PENDING: '#F5A623',
        };
        return styles[status] || '#888888';
    };

    return (
        <div className="flex flex-col h-screen bg-white">
            {/* Header - Inditex style */}
            <header className="bg-white px-6 py-4 flex items-center gap-4 shrink-0" style={{ borderBottom: '1px solid #E0E0E0' }}>
                <button
                    onClick={handleBack}
                    className="p-2 transition-colors"
                    style={{ color: '#000000' }}
                    title="Back to Active Styles"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-grow">
                    <h1 style={{ fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#000000' }}>
                        {project.title}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        {project.poNumbers?.slice(0, 3).map(po => (
                            <span
                                key={po.id}
                                style={{
                                    padding: '2px 8px',
                                    fontSize: '10px',
                                    fontWeight: 400,
                                    color: '#666666',
                                    border: '1px solid #E0E0E0'
                                }}
                            >
                                PO: {po.number}
                            </span>
                        ))}
                        {project.poNumbers && project.poNumbers.length > 3 && (
                            <span style={{ fontSize: '10px', color: '#888888' }}>+{project.poNumbers.length - 3} more</span>
                        )}
                    </div>
                </div>
                <span
                    style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: getStatusStyle(project.status)
                    }}
                >
                    {project.status}
                </span>
            </header>

            {/* Tab Navigation - Inditex style */}
            <nav className="bg-white px-6 flex justify-center gap-0 shrink-0 overflow-x-auto" style={{ borderBottom: '1px solid #E0E0E0' }}>
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                const routes: Record<TabId, string> = {
                                    'tech-pack': `/styles/${id}`,
                                    'order-sheet': `/styles/${id}/order-sheet`,
                                    'consumption': `/styles/${id}/consumption`,
                                    'pp-meeting': `/styles/${id}/pp-meeting`,
                                    'mq-control': `/styles/${id}/materials`,
                                    'commercial': `/styles/${id}/documents/invoice`,
                                    'qc-inspect': `/styles/${id}/inline-phase`,
                                };
                                navigate(routes[tab.id]);
                            }}
                            className="flex items-center gap-2 whitespace-nowrap transition-colors"
                            style={{
                                padding: '12px 16px',
                                fontSize: '11px',
                                fontWeight: isActive ? 700 : 400,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                color: isActive ? '#000000' : '#666666',
                                borderBottom: isActive ? '2px solid #000000' : '2px solid transparent',
                                background: 'transparent'
                            }}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </nav>

            {/* Tab Content */}
            <main className="flex-grow overflow-hidden">
                {renderTabContent()}
            </main>
        </div>
    );
};

export default StyleDetailPage;
