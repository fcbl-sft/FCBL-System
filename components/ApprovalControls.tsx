import React, { useState } from 'react';
import { WorkflowFields, ApprovalStatus, ApprovalAction, UserRole, createDefaultWorkflow } from '../types';
import StatusBadge from './StatusBadge';
import { Save, SendHorizonal, Undo2, CheckCircle, XCircle, FileEdit, X } from 'lucide-react';

interface ApprovalControlsProps {
    workflow: WorkflowFields | undefined;
    onWorkflowChange: (workflow: WorkflowFields) => void;
    onSave: () => void;
    userRole: UserRole;
    userName: string;
    userId: string;
    sectionLabel: string; // e.g. "Tech Pack", "Order Sheet"
}

// Roles that can approve/reject
const APPROVER_ROLES: UserRole[] = ['super_admin', 'admin', 'director'];
// Roles that can submit
const SUBMITTER_ROLES: UserRole[] = ['super_admin', 'admin', 'director', 'merchandiser', 'qc'];

const ApprovalControls: React.FC<ApprovalControlsProps> = ({
    workflow: workflowProp,
    onWorkflowChange,
    onSave,
    userRole,
    userName,
    userId,
    sectionLabel,
}) => {
    const workflow = workflowProp || createDefaultWorkflow();
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionComment, setRejectionComment] = useState('');
    const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

    const canApprove = APPROVER_ROLES.includes(userRole);
    const canSubmit = SUBMITTER_ROLES.includes(userRole);
    const status = workflow.status;

    const createAction = (action: ApprovalAction['action'], comments?: string): ApprovalAction => ({
        id: `action-${Date.now()}`,
        action,
        userId,
        userName,
        userRole,
        timestamp: new Date().toISOString(),
        comments,
    });

    const handleSubmit = () => {
        const updated: WorkflowFields = {
            ...workflow,
            status: 'SUBMITTED',
            submittedBy: userName,
            submittedAt: new Date().toISOString(),
            rejectedBy: undefined,
            rejectedAt: undefined,
            rejectionComment: undefined,
            history: [...workflow.history, createAction('SUBMIT')],
        };
        onWorkflowChange(updated);
        setShowConfirmSubmit(false);
    };

    const handleRecall = () => {
        const updated: WorkflowFields = {
            ...workflow,
            status: 'DRAFT',
            submittedBy: undefined,
            submittedAt: undefined,
            history: [...workflow.history, createAction('RECALL')],
        };
        onWorkflowChange(updated);
    };

    const handleApprove = () => {
        const updated: WorkflowFields = {
            ...workflow,
            status: 'APPROVED',
            approvedBy: userName,
            approvedAt: new Date().toISOString(),
            history: [...workflow.history, createAction('APPROVE')],
        };
        onWorkflowChange(updated);
    };

    const handleReject = () => {
        if (!rejectionComment.trim()) return;
        const updated: WorkflowFields = {
            ...workflow,
            status: 'REJECTED',
            rejectedBy: userName,
            rejectedAt: new Date().toISOString(),
            rejectionComment: rejectionComment.trim(),
            approvedBy: undefined,
            approvedAt: undefined,
            history: [...workflow.history, createAction('REJECT', rejectionComment.trim())],
        };
        onWorkflowChange(updated);
        setShowRejectModal(false);
        setRejectionComment('');
    };

    const handleRequestRevision = () => {
        const updated: WorkflowFields = {
            ...workflow,
            status: 'DRAFT',
            approvedBy: undefined,
            approvedAt: undefined,
            history: [...workflow.history, createAction('REQUEST_REVISION')],
        };
        onWorkflowChange(updated);
    };

    const formatDate = (iso?: string) => {
        if (!iso) return '';
        try {
            return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch { return iso; }
    };

    return (
        <>
            {/* Rejection Banner */}
            {status === 'REJECTED' && (
                <div className="bg-red-50 border border-red-200 p-4 flex flex-col gap-1 no-print">
                    <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
                        <XCircle className="w-4 h-4" /> REJECTED — Please review and resubmit
                    </div>
                    {workflow.rejectionComment && (
                        <p className="text-red-600 text-sm ml-6">Reason: "{workflow.rejectionComment}"</p>
                    )}
                    <p className="text-red-500 text-xs ml-6">
                        Rejected by {workflow.rejectedBy} on {formatDate(workflow.rejectedAt)}
                    </p>
                </div>
            )}

            {/* Approved Banner */}
            {status === 'APPROVED' && (
                <div className="bg-emerald-50 border border-emerald-200 p-4 flex flex-col gap-1 no-print">
                    <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                        <CheckCircle className="w-4 h-4" /> APPROVED
                    </div>
                    <p className="text-emerald-500 text-xs ml-6">
                        Approved by {workflow.approvedBy} on {formatDate(workflow.approvedAt)}
                    </p>
                </div>
            )}

            {/* Footer Bar */}
            <div className="bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between shrink-0 no-print">
                {/* Left: Status info */}
                <div className="flex items-center gap-3 flex-wrap">
                    <StatusBadge status={status} />
                    {status === 'SUBMITTED' && (
                        <span className="text-xs text-gray-500">
                            Submitted by {workflow.submittedBy} on {formatDate(workflow.submittedAt)}
                        </span>
                    )}
                </div>

                {/* Right: Action buttons */}
                <div className="flex items-center gap-2">
                    {/* DRAFT or REJECTED → Save + Submit */}
                    {(status === 'DRAFT' || status === 'REJECTED') && canSubmit && (
                        <>
                            <button
                                onClick={onSave}
                                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-all"
                            >
                                <Save className="w-3.5 h-3.5" /> Save Draft
                            </button>
                            <button
                                onClick={() => setShowConfirmSubmit(true)}
                                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-emerald-600 text-white hover:bg-emerald-700 transition-all"
                            >
                                <SendHorizonal className="w-3.5 h-3.5" /> Submit for Approval
                            </button>
                        </>
                    )}

                    {/* SUBMITTED → Recall (for submitter) */}
                    {status === 'SUBMITTED' && canSubmit && !canApprove && (
                        <button
                            onClick={handleRecall}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-amber-500 text-white hover:bg-amber-600 transition-all"
                        >
                            <Undo2 className="w-3.5 h-3.5" /> Recall Submission
                        </button>
                    )}

                    {/* SUBMITTED → Approve/Reject (for admins) */}
                    {status === 'SUBMITTED' && canApprove && (
                        <>
                            <button
                                onClick={handleRecall}
                                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-amber-500 text-white hover:bg-amber-600 transition-all"
                            >
                                <Undo2 className="w-3.5 h-3.5" /> Recall
                            </button>
                            <button
                                onClick={() => setShowRejectModal(true)}
                                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-red-600 text-white hover:bg-red-700 transition-all"
                            >
                                <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                            <button
                                onClick={handleApprove}
                                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-emerald-600 text-white hover:bg-emerald-700 transition-all"
                            >
                                <CheckCircle className="w-3.5 h-3.5" /> Approve
                            </button>
                        </>
                    )}

                    {/* APPROVED → Request Revision */}
                    {status === 'APPROVED' && canSubmit && (
                        <button
                            onClick={handleRequestRevision}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-amber-500 text-white hover:bg-amber-600 transition-all"
                        >
                            <FileEdit className="w-3.5 h-3.5" /> Request Revision
                        </button>
                    )}
                </div>
            </div>

            {/* Confirm Submit Dialog */}
            {showConfirmSubmit && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                    <div className="bg-white shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
                        <h3 className="font-black text-sm uppercase tracking-widest mb-3">Submit {sectionLabel}?</h3>
                        <p className="text-sm text-gray-600 mb-5">
                            This will lock the content and send it for Admin/Director approval. You can recall the submission before it is reviewed.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowConfirmSubmit(false)} className="px-4 py-2 text-xs font-bold uppercase border border-gray-300 hover:bg-gray-50 transition-all">Cancel</button>
                            <button onClick={handleSubmit} className="px-4 py-2 text-xs font-bold uppercase bg-emerald-600 text-white hover:bg-emerald-700 transition-all">Confirm Submit</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                    <div className="bg-white shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-black text-sm uppercase tracking-widest text-red-700">Reject {sectionLabel}</h3>
                            <button onClick={() => setShowRejectModal(false)} className="p-1 hover:bg-gray-100"><X className="w-4 h-4" /></button>
                        </div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Rejection Comment (Required)</label>
                        <textarea
                            value={rejectionComment}
                            onChange={e => setRejectionComment(e.target.value)}
                            rows={3}
                            className="w-full border border-gray-300 p-2 text-sm focus:ring-2 focus:ring-red-200 outline-none"
                            placeholder="Explain why this is being rejected..."
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 text-xs font-bold uppercase border border-gray-300 hover:bg-gray-50 transition-all">Cancel</button>
                            <button
                                onClick={handleReject}
                                disabled={!rejectionComment.trim()}
                                className="px-4 py-2 text-xs font-bold uppercase bg-red-600 text-white hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirm Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ApprovalControls;
