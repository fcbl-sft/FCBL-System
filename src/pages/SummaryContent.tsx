/**
 * Summary Content - Style overview page shown as default landing
 * Three-column layout: Product Info | Production Status | Tasks
 */
import React from 'react';
import { useParams } from 'react-router-dom';
import { useProjects } from '../context/ProjectContext';
import { Calendar, User, FileText, Package, CheckCircle, AlertCircle, Clock } from 'lucide-react';

const SummaryContent: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { getProject } = useProjects();
    const project = id ? getProject(id) : undefined;

    if (!project) {
        return <div className="p-6">Loading...</div>;
    }

    // Get latest inspection for quality status
    const latestInspection = project.inspections?.[project.inspections.length - 1];
    const qcResult = latestInspection?.data?.overallResult || 'PENDING';

    // Calculate some summary data
    const techPackFilesCount = project.techPackFiles?.length || 0;
    const ordersCount = project.orderSheet ? 1 : 0;
    const ppMeetingsCount = project.ppMeetings?.length || 0;

    // Format date helper
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'Not set';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
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

                            {/* SPECIFICATIONS */}
                            <div className="py-2 border-t border-gray-100">
                                <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Specifications</p>
                                <p className="text-xs text-gray-800">
                                    <StatusDot status={techPackFilesCount > 0 ? 'ok' : 'pending'} />
                                    {techPackFilesCount > 0 ? `Updated ${formatDate(project.updatedAt)}` : 'Not uploaded'}
                                </p>
                            </div>

                            {/* SAMPLES */}
                            <div className="py-2 border-t border-gray-100">
                                <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Samples</p>
                                <p className="text-xs text-gray-800">
                                    <StatusDot status={ppMeetingsCount > 0 ? 'ok' : 'pending'} />
                                    {ppMeetingsCount > 0 ? `${ppMeetingsCount} Meeting(s) recorded` : 'No meetings yet'}
                                </p>
                            </div>

                            {/* QUALITY APPROVALS */}
                            <div className="py-2 border-t border-gray-100">
                                <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Quality Approvals</p>
                                <div className="flex items-center gap-2">
                                    {project.productColors?.slice(0, 1).map(color => (
                                        <span
                                            key={color.id}
                                            className="w-3 h-3 rounded"
                                            style={{ backgroundColor: color.hex }}
                                        />
                                    ))}
                                    <p className="text-xs text-gray-800">
                                        <StatusDot status={qcResult === 'ACCEPTED' ? 'ok' : qcResult === 'REJECTED' ? 'warning' : 'pending'} />
                                        {qcResult === 'ACCEPTED' ? 'Approved' : qcResult === 'REJECTED' ? 'Rejected' : 'Pending approval'}
                                    </p>
                                </div>
                            </div>

                            {/* ORDERS */}
                            <div className="py-2 border-t border-gray-100">
                                <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Orders</p>
                                <p className="text-xs text-gray-800">
                                    <StatusDot status={ordersCount > 0 ? 'ok' : 'pending'} />
                                    {ordersCount > 0 ? `${ordersCount} Order(s) formalized` : 'No orders yet'}
                                </p>
                            </div>

                            {/* PRODUCT FILES */}
                            <div className="py-2 border-t border-gray-100">
                                <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Product Files</p>
                                <p className="text-xs text-gray-800">
                                    <StatusDot status={techPackFilesCount > 0 ? 'ok' : 'pending'} />
                                    {techPackFilesCount > 0 ? `${techPackFilesCount} Attached` : 'No files attached'}
                                </p>
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

                    {/* RIGHT COLUMN - Tasks */}
                    <div className="bg-white rounded-lg border border-gray-200 p-5">
                        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-4">
                            Tasks
                        </h3>

                        {/* Task Items */}
                        <div className="space-y-4">
                            {/* PO Numbers as tasks */}
                            {project.poNumbers?.map((po, index) => (
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
    );
};

export default SummaryContent;
