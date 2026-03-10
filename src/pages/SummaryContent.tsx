/**
 * Summary Content - Style overview page shown as default landing
 * Three-column layout: Product Info | Production Status | Approval Dashboard
 */
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjects } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { Calendar, User, Package, CheckCircle, Clock, FileEdit, XCircle, SendHorizonal, X } from 'lucide-react';
import { ApprovalStatus, WorkflowFields, createDefaultWorkflow } from '../../types';
import StatusBadge from '../../components/StatusBadge';

// Section definitions for the approval dashboard
const SECTIONS = [
    { key: 'techPack', label: 'Tech Pack' },
    { key: 'orderSheet', label: 'Order Sheet' },
    { key: 'consumption', label: 'Consumption' },
    { key: 'ppMeeting', label: 'PP Meeting' },
    { key: 'mqControl', label: 'MQ Control' },
    { key: 'invoice', label: 'Invoice' },
    { key: 'packing', label: 'Packing List' },
    { key: 'inspection', label: 'QC Inspect' },
] as const;

// Roles that can approve/reject
const APPROVER_ROLES = ['super_admin', 'admin', 'director'];

const SummaryContent: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { getProject, updateProject } = useProjects();
    const { userRole, user, profile } = useAuth();
    const project = id ? getProject(id) : undefined;
    const [rejectSection, setRejectSection] = useState<string | null>(null);
    const [rejectComment, setRejectComment] = useState('');

    if (!project) {
        return <div className="p-6">Loading...</div>;
    }

    const navigate = useNavigate();
    const canApprove = APPROVER_ROLES.includes(userRole || '');

    // Helper to get workflow for each section from project data
    // (Must be defined before getStageStatus which calls it)
    const getWorkflow = (sectionKey: string): WorkflowFields => {
        switch (sectionKey) {
            case 'techPack': return project.techPackWorkflow || createDefaultWorkflow();
            case 'orderSheet': return project.orderSheet?.workflow || createDefaultWorkflow();
            case 'consumption': return project.consumption?.workflow || createDefaultWorkflow();
            case 'ppMeeting': {
                const activeMeeting = project.ppMeetings?.[project.ppMeetings.length - 1];
                return activeMeeting?.workflow || createDefaultWorkflow();
            }
            case 'mqControl': return project.mqControlWorkflow || createDefaultWorkflow();
            case 'invoice': {
                const activeInvoice = project.invoices?.[project.invoices.length - 1];
                return activeInvoice?.workflow || createDefaultWorkflow();
            }
            case 'packing': return project.packing?.workflow || createDefaultWorkflow();
            case 'inspection': {
                const activeInspection = project.inspections?.[project.inspections.length - 1];
                return activeInspection?.workflow || createDefaultWorkflow();
            }
            default: return createDefaultWorkflow();
        }
    };

    // Production stages in correct order
    const PRODUCTION_STAGES = [
        { key: 'techPack', label: 'Tech Pack', short: 'TP', path: `/styles/${id}/tech-pack` },
        { key: 'orderSheet', label: 'Order Sheet', short: 'OS', path: `/styles/${id}/order-sheet` },
        { key: 'consumption', label: 'Consumption', short: 'CO', path: `/styles/${id}/consumption` },
        { key: 'ppMeeting', label: 'PP Meeting', short: 'PP', path: `/styles/${id}/pp-meeting` },
        { key: 'mqControl', label: 'MQ Control', short: 'MQ', path: `/styles/${id}/materials` },
        { key: 'inspection', label: 'QC Inspect', short: 'QC', path: `/styles/${id}/inline-phase` },
        { key: 'invoice', label: 'Invoice', short: 'INV', path: `/styles/${id}/documents/invoice` },
        { key: 'packing', label: 'Packing List', short: 'PL', path: `/styles/${id}/documents/packing` },
    ];

    // Determine stage status from workflow
    const getStageStatus = (stageKey: string): 'completed' | 'in_progress' | 'pending' => {
        const wf = getWorkflow(stageKey);
        if (wf.status === 'APPROVED') return 'completed';
        if (wf.status === 'SUBMITTED' || wf.status === 'REJECTED') return 'in_progress';
        // Check if there's any data entered (DRAFT with data)
        if (wf.status === 'DRAFT' && wf.submittedAt) return 'in_progress';
        // Check if section has data
        switch (stageKey) {
            case 'techPack': if ((project.techPackFiles?.length || 0) > 0) return 'in_progress'; break;
            case 'orderSheet': if (project.orderSheet?.factoryName) return 'in_progress'; break;
            case 'consumption': if ((project.consumption?.yarnItems?.length || 0) > 0 || (project.consumption?.accessoryItems?.length || 0) > 0) return 'in_progress'; break;
            case 'ppMeeting': if ((project.ppMeetings?.length || 0) > 0) return 'in_progress'; break;
            case 'mqControl': if ((project.materialControl?.length || 0) > 0) return 'in_progress'; break;
            case 'inspection': if ((project.inspections?.length || 0) > 0) return 'in_progress'; break;
            case 'invoice': if ((project.invoices?.length || 0) > 0) return 'in_progress'; break;
            case 'packing': if (project.packing?.supplierName) return 'in_progress'; break;
        }
        return 'pending';
    };

    // Build stages with statuses
    const stagesWithStatus = PRODUCTION_STAGES.map(stage => ({
        ...stage,
        status: getStageStatus(stage.key),
        workflow: getWorkflow(stage.key),
    }));

    // Find the current (first in_progress) stage index
    const currentStageIndex = stagesWithStatus.findIndex(s => s.status === 'in_progress');
    const completedCount = stagesWithStatus.filter(s => s.status === 'completed').length;

    // Get latest inspection for quality status (used in Tasks section)
    const latestInspection = project.inspections?.[project.inspections.length - 1];
    const qcResult = latestInspection?.data?.overallResult || 'PENDING';

    // Format date helper
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'Not set';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formatRelativeTime = (dateStr?: string) => {
        if (!dateStr) return '';
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    // Status dot component
    const StatusDot: React.FC<{ status: 'ok' | 'pending' | 'warning' }> = ({ status }) => {
        const colors = {
            ok: '#2D8A4E',
            pending: '#888888',
            warning: '#F5A623'
        };
        return (
            <span
                className="inline-block w-2 h-2 rounded-full mr-2"
                style={{ backgroundColor: colors[status] }}
            />
        );
    };

    // Update workflow for a section
    const updateWorkflow = (sectionKey: string, wf: WorkflowFields) => {
        if (!project || !id) return;
        let updates: any = {};
        switch (sectionKey) {
            case 'techPack':
                updates = { techPackWorkflow: wf };
                break;
            case 'orderSheet':
                updates = { orderSheet: { ...project.orderSheet, workflow: wf } };
                break;
            case 'consumption':
                updates = { consumption: { ...project.consumption, workflow: wf } };
                break;
            case 'ppMeeting': {
                const meetings = [...(project.ppMeetings || [])];
                if (meetings.length > 0) {
                    meetings[meetings.length - 1] = { ...meetings[meetings.length - 1], workflow: wf };
                    updates = { ppMeetings: meetings };
                }
                break;
            }
            case 'mqControl':
                updates = { mqControlWorkflow: wf };
                break;
            case 'invoice': {
                const invoices = [...(project.invoices || [])];
                if (invoices.length > 0) {
                    invoices[invoices.length - 1] = { ...invoices[invoices.length - 1], workflow: wf };
                    updates = { invoices };
                }
                break;
            }
            case 'packing':
                updates = { packing: { ...project.packing, workflow: wf } };
                break;
            case 'inspection': {
                const inspections = [...(project.inspections || [])];
                if (inspections.length > 0) {
                    inspections[inspections.length - 1] = { ...inspections[inspections.length - 1], workflow: wf };
                    updates = { inspections };
                }
                break;
            }
        }
        updateProject(id, updates);
    };

    // Quick approve/reject actions
    const handleQuickApprove = (sectionKey: string) => {
        const wf = getWorkflow(sectionKey);
        const updated: WorkflowFields = {
            ...wf,
            status: 'APPROVED',
            approvedBy: profile?.name || user?.fullName || 'Admin',
            approvedAt: new Date().toISOString(),
            history: [...(wf.history || []), {
                id: `action-${Date.now()}`,
                action: 'APPROVE',
                userId: user?.id || '',
                userName: profile?.name || user?.fullName || 'Admin',
                userRole: userRole || 'admin',
                timestamp: new Date().toISOString(),
            }],
        };
        updateWorkflow(sectionKey, updated);
    };

    const handleQuickReject = (sectionKey: string) => {
        if (!rejectComment.trim()) return;
        const wf = getWorkflow(sectionKey);
        const updated: WorkflowFields = {
            ...wf,
            status: 'REJECTED',
            rejectedBy: profile?.name || user?.fullName || 'Admin',
            rejectedAt: new Date().toISOString(),
            rejectionComment: rejectComment.trim(),
            approvedBy: undefined,
            approvedAt: undefined,
            history: [...(wf.history || []), {
                id: `action-${Date.now()}`,
                action: 'REJECT',
                userId: user?.id || '',
                userName: profile?.name || user?.fullName || 'Admin',
                userRole: userRole || 'admin',
                timestamp: new Date().toISOString(),
                comments: rejectComment.trim(),
            }],
        };
        updateWorkflow(sectionKey, updated);
        setRejectSection(null);
        setRejectComment('');
    };

    // Get pending submissions
    const pendingSubmissions = SECTIONS
        .map(s => ({ ...s, workflow: getWorkflow(s.key) }))
        .filter(s => s.workflow.status === 'SUBMITTED');

    // Count statuses
    const statusCounts = SECTIONS.reduce((acc, s) => {
        const status = getWorkflow(s.key).status;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="h-full overflow-auto bg-gray-50">
            <div className="p-6">
                <div className="grid grid-cols-3 gap-6">
                    {/* LEFT COLUMN - Product Info */}
                    <div className="bg-white rounded-lg border border-gray-200 p-5">
                        {/* Product Image */}
                        <div className="w-full aspect-square bg-gray-100 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                            {project.productImage ? (
                                <img
                                    src={project.productImage}
                                    alt={project.title}
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <Package className="w-16 h-16 text-gray-300" />
                            )}
                        </div>

                        {/* Style Name */}
                        <h2 className="text-sm font-bold text-gray-900 mb-1">
                            {project.title}
                        </h2>

                        {/* Brand · Category */}
                        <p className="text-xs text-gray-500 mb-3">
                            {project.brand || 'No Brand'} · {project.team || 'No Team'}
                        </p>

                        {/* Color Swatches */}
                        {project.productColors && project.productColors.length > 0 && (
                            <div className="flex gap-1 mb-4">
                                {project.productColors.map(color => (
                                    <div
                                        key={color.id}
                                        className="w-5 h-5 rounded border border-gray-200"
                                        style={{ backgroundColor: color.hex }}
                                        title={color.name || color.hex}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Supplier */}
                        <div className="border-t border-gray-100 pt-3 mt-3">
                            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Supplier</p>
                            <p className="text-sm text-gray-700">
                                {project.orderSheet?.factoryName || 'Not specified'}
                            </p>
                        </div>

                        {/* Contact Members */}
                        <div className="border-t border-gray-100 pt-3 mt-3">
                            <button className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                                <User className="w-3 h-3" />
                                Add contact members
                            </button>
                        </div>
                    </div>

                    {/* MIDDLE COLUMN - Production Status */}
                    <div className="space-y-4">
                        {/* PRODUCTION Section */}
                        <div className="bg-white rounded-lg border border-gray-200 p-5">
                            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-4">
                                Production
                            </h3>

                            {/* Upcoming Dates */}
                            <div className="flex items-center text-xs text-gray-600 mb-3">
                                <Calendar className="w-3 h-3 mr-2 text-gray-400" />
                                <span>Handover: </span>
                                <span className="ml-1 font-medium">
                                    {formatDate(project.orderSheet?.shipmentDate)}
                                </span>
                            </div>

                            {/* Progress Summary */}
                            <div className="border-t border-gray-100 pt-3 mb-3">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">
                                    Progress: {completedCount} of {PRODUCTION_STAGES.length} Complete
                                </p>

                                {/* Visual Progress Bar */}
                                <div className="flex items-center justify-between mb-1" style={{ padding: '0 2px' }}>
                                    {stagesWithStatus.map((stage, i) => {
                                        const isCompleted = stage.status === 'completed';
                                        const isCurrent = stage.status === 'in_progress' && i === currentStageIndex;
                                        const isInProgress = stage.status === 'in_progress';
                                        const nodeColor = isCompleted ? '#4CAF50' : (isCurrent || isInProgress) ? '#2196F3' : '#D0D0D0';
                                        const nodeSize = isCurrent ? 10 : 8;

                                        return (
                                            <React.Fragment key={stage.key}>
                                                {/* Connector line (before node, skip first) */}
                                                {i > 0 && (
                                                    <div
                                                        className="flex-1"
                                                        style={{
                                                            height: '2px',
                                                            backgroundColor: stagesWithStatus[i - 1].status === 'completed' ? '#4CAF50' : '#E0E0E0',
                                                        }}
                                                    />
                                                )}
                                                {/* Node */}
                                                <div
                                                    onClick={() => navigate(stage.path)}
                                                    style={{
                                                        width: nodeSize,
                                                        height: nodeSize,
                                                        borderRadius: '50%',
                                                        backgroundColor: isCompleted || isCurrent || isInProgress ? nodeColor : 'transparent',
                                                        border: isCompleted || isCurrent || isInProgress ? 'none' : `2px solid ${nodeColor}`,
                                                        cursor: 'pointer',
                                                        flexShrink: 0,
                                                        transition: 'all 0.2s ease',
                                                        boxShadow: isCurrent ? '0 0 0 3px rgba(33,150,243,0.2)' : 'none',
                                                    }}
                                                    title={stage.label}
                                                />
                                            </React.Fragment>
                                        );
                                    })}
                                </div>

                                {/* Short labels under nodes */}
                                <div className="flex items-start justify-between" style={{ padding: '0 0px' }}>
                                    {stagesWithStatus.map((stage, i) => (
                                        <React.Fragment key={stage.key}>
                                            {i > 0 && <div className="flex-1" />}
                                            <span
                                                className="text-center"
                                                style={{
                                                    fontSize: '8px',
                                                    color: stage.status === 'completed' ? '#4CAF50' : stage.status === 'in_progress' ? '#2196F3' : '#AAAAAA',
                                                    fontWeight: stage.status === 'in_progress' && i === currentStageIndex ? 700 : 400,
                                                    width: stage.short.length > 2 ? '24px' : '18px',
                                                    flexShrink: 0,
                                                    lineHeight: '1.2',
                                                }}
                                            >
                                                {stage.short}
                                            </span>
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>

                            {/* Stage List */}
                            <div className="space-y-0">
                                {stagesWithStatus.map((stage, i) => {
                                    const isCompleted = stage.status === 'completed';
                                    const isCurrent = stage.status === 'in_progress' && i === currentStageIndex;
                                    const isInProgress = stage.status === 'in_progress';

                                    return (
                                        <div
                                            key={stage.key}
                                            onClick={() => navigate(stage.path)}
                                            className="flex items-center py-2 border-t border-gray-100 cursor-pointer transition-colors"
                                            style={{
                                                backgroundColor: isCurrent ? 'rgba(33,150,243,0.04)' : 'transparent',
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = isCurrent ? 'rgba(33,150,243,0.08)' : '#f9fafb')}
                                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = isCurrent ? 'rgba(33,150,243,0.04)' : 'transparent')}
                                        >
                                            {/* Status Icon */}
                                            <span
                                                className="mr-2 flex-shrink-0 flex items-center justify-center"
                                                style={{
                                                    width: '16px',
                                                    height: '16px',
                                                    fontSize: isCompleted ? '12px' : '10px',
                                                    color: isCompleted ? '#4CAF50' : (isCurrent || isInProgress) ? '#2196F3' : '#CCCCCC',
                                                }}
                                            >
                                                {isCompleted ? '✓' : (isCurrent || isInProgress) ? '●' : '○'}
                                            </span>

                                            {/* Stage Name */}
                                            <span
                                                className="text-xs uppercase tracking-wide flex-1"
                                                style={{
                                                    fontWeight: isCurrent ? 700 : isCompleted ? 600 : 400,
                                                    color: isCompleted ? '#333' : (isCurrent || isInProgress) ? '#1565C0' : '#999',
                                                }}
                                            >
                                                {stage.label}
                                            </span>

                                            {/* Status Text + Date */}
                                            <span
                                                className="text-[10px] text-right"
                                                style={{
                                                    color: isCompleted ? '#4CAF50' : (isCurrent || isInProgress) ? '#2196F3' : '#BBBBBB',
                                                    fontWeight: isCurrent ? 600 : 400,
                                                }}
                                            >
                                                {isCompleted
                                                    ? (stage.workflow.approvedAt ? formatDate(stage.workflow.approvedAt) : 'Completed')
                                                    : isCurrent
                                                        ? '← Current'
                                                        : isInProgress
                                                            ? 'In Progress'
                                                            : 'Pending'
                                                }
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* PRE-PRODUCTION Section */}
                        <div className="bg-white rounded-lg border border-gray-200 p-5">
                            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-4">
                                Pre-Production
                            </h3>

                            <div className="py-2">
                                <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Development</p>
                                <p className="text-xs text-gray-800">
                                    Created {formatDate(project.updatedAt)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN - Approval Dashboard */}
                    <div className="space-y-4">
                        {/* Section Status Overview */}
                        <div className="bg-white rounded-lg border border-gray-200 p-5">
                            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-4">
                                Section Status
                            </h3>

                            {/* Status Summary Counters */}
                            <div className="grid grid-cols-4 gap-2 mb-4">
                                <div className="text-center py-2 bg-gray-50 rounded">
                                    <div className="text-lg font-bold text-gray-600">{statusCounts['DRAFT'] || 0}</div>
                                    <div className="text-[10px] text-gray-400 uppercase">Draft</div>
                                </div>
                                <div className="text-center py-2 bg-amber-50 rounded">
                                    <div className="text-lg font-bold text-amber-600">{statusCounts['SUBMITTED'] || 0}</div>
                                    <div className="text-[10px] text-amber-500 uppercase">Pending</div>
                                </div>
                                <div className="text-center py-2 bg-emerald-50 rounded">
                                    <div className="text-lg font-bold text-emerald-600">{statusCounts['APPROVED'] || 0}</div>
                                    <div className="text-[10px] text-emerald-500 uppercase">Approved</div>
                                </div>
                                <div className="text-center py-2 bg-red-50 rounded">
                                    <div className="text-lg font-bold text-red-600">{statusCounts['REJECTED'] || 0}</div>
                                    <div className="text-[10px] text-red-500 uppercase">Rejected</div>
                                </div>
                            </div>

                            {/* Section List */}
                            <div className="space-y-2">
                                {SECTIONS.map(section => {
                                    const wf = getWorkflow(section.key);
                                    return (
                                        <div key={section.key} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                                            <span className="text-xs text-gray-700">{section.label}</span>
                                            <StatusBadge status={wf.status} size="sm" />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Pending Approvals — only for approver roles */}
                        {canApprove && pendingSubmissions.length > 0 && (
                            <div className="bg-white rounded-lg border border-amber-200 p-5">
                                <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                                    <SendHorizonal className="w-3.5 h-3.5" />
                                    Pending Approvals ({pendingSubmissions.length})
                                </h3>

                                <div className="space-y-3">
                                    {pendingSubmissions.map(section => (
                                        <div key={section.key} className="bg-amber-50 border border-amber-100 rounded p-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-bold text-gray-800">{section.label}</span>
                                                {section.workflow.submittedAt && (
                                                    <span className="text-[10px] text-gray-400">
                                                        {formatRelativeTime(section.workflow.submittedAt)}
                                                    </span>
                                                )}
                                            </div>
                                            {section.workflow.submittedBy && (
                                                <p className="text-[11px] text-gray-500 mb-2">
                                                    By: {section.workflow.submittedBy}
                                                </p>
                                            )}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleQuickApprove(section.key)}
                                                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white hover:bg-emerald-700 transition-all rounded"
                                                >
                                                    <CheckCircle className="w-3 h-3" /> Approve
                                                </button>
                                                <button
                                                    onClick={() => setRejectSection(section.key)}
                                                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-red-600 text-white hover:bg-red-700 transition-all rounded"
                                                >
                                                    <XCircle className="w-3 h-3" /> Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tasks (PO Numbers & Inspections) */}
                        <div className="bg-white rounded-lg border border-gray-200 p-5">
                            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-4">
                                Tasks
                            </h3>

                            <div className="space-y-4">
                                {/* PO Numbers as tasks */}
                                {project.poNumbers?.map((po) => (
                                    <div key={po.id} className="border-b border-gray-100 pb-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs text-gray-500">
                                                {po.deliveryDate ? formatDate(po.deliveryDate) : 'No date'}
                                            </span>
                                            {po.deliveryDate && new Date(po.deliveryDate) < new Date() ? (
                                                <span className="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded">
                                                    OVERDUE
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400">
                                                    <Clock className="w-3 h-3 inline mr-1" />
                                                    Due
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm font-medium text-gray-900 mb-1">
                                            Order {po.number}
                                        </p>
                                        {po.quantity && (
                                            <p className="text-xs text-gray-500">
                                                Quantity: {po.quantity.toLocaleString()} pcs
                                            </p>
                                        )}
                                    </div>
                                ))}

                                {/* Inspection task */}
                                {project.inspections && project.inspections.length > 0 && (
                                    <div className="border-b border-gray-100 pb-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs text-gray-500">
                                                QC Inspection
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded ${qcResult === 'ACCEPTED' ? 'bg-green-50 text-green-600' :
                                                qcResult === 'REJECTED' ? 'bg-red-50 text-red-600' :
                                                    'bg-yellow-50 text-yellow-600'
                                                }`}>
                                                {qcResult}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium text-gray-900">
                                            {project.inspections.length} Inspection(s)
                                        </p>
                                    </div>
                                )}

                                {/* Empty state */}
                                {(!project.poNumbers || project.poNumbers.length === 0) &&
                                    (!project.inspections || project.inspections.length === 0) && (
                                        <div className="text-center py-6 text-gray-400">
                                            <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                                            <p className="text-xs">No pending tasks</p>
                                        </div>
                                    )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reject Modal */}
            {rejectSection && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                    <div className="bg-white shadow-xl p-6 w-full max-w-md mx-4 rounded-lg" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-black text-sm uppercase tracking-widest text-red-700">
                                Reject {SECTIONS.find(s => s.key === rejectSection)?.label}
                            </h3>
                            <button onClick={() => { setRejectSection(null); setRejectComment(''); }} className="p-1 hover:bg-gray-100 rounded">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Rejection Comment (Required)</label>
                        <textarea
                            value={rejectComment}
                            onChange={e => setRejectComment(e.target.value)}
                            rows={3}
                            className="w-full border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-red-200 outline-none rounded"
                            placeholder="Explain why this is being rejected..."
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => { setRejectSection(null); setRejectComment(''); }}
                                className="px-4 py-2 text-xs font-bold uppercase border border-gray-300 hover:bg-gray-50 transition-all rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleQuickReject(rejectSection)}
                                disabled={!rejectComment.trim()}
                                className="px-4 py-2 text-xs font-bold uppercase bg-red-600 text-white hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded"
                            >
                                Confirm Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SummaryContent;

