import React from 'react';
import { ApprovalStatus } from '../types';
import { FileEdit, Clock, CheckCircle, XCircle } from 'lucide-react';

interface StatusBadgeProps {
    status: ApprovalStatus;
    size?: 'sm' | 'md';
}

const CONFIG: Record<ApprovalStatus, { bg: string; text: string; border: string; icon: React.ElementType; label: string }> = {
    DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', icon: FileEdit, label: 'Draft' },
    SUBMITTED: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', icon: Clock, label: 'Pending Approval' },
    APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300', icon: CheckCircle, label: 'Approved' },
    REJECTED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', icon: XCircle, label: 'Rejected' },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
    const c = CONFIG[status] || CONFIG.DRAFT;
    const Icon = c.icon;
    const sizeClass = size === 'sm' ? 'text-[10px] px-2 py-0.5 gap-1' : 'text-xs px-3 py-1 gap-1.5';

    return (
        <span className={`inline-flex items-center font-bold uppercase tracking-wider border ${c.bg} ${c.text} ${c.border} ${sizeClass}`}>
            <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
            {c.label}
        </span>
    );
};

export default StatusBadge;
