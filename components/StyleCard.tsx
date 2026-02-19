import React from 'react';
import { Edit3, Trash2 } from 'lucide-react';
import { Project, ProjectStatus, MainStatus, ProductionStage } from '../types';

interface StyleCardProps {
    project: Project;
    onClick: () => void;
    onEdit?: (e: React.MouseEvent) => void;
    onDelete?: (e: React.MouseEvent) => void;
}

const StyleCard: React.FC<StyleCardProps> = ({ project, onClick, onEdit, onDelete }) => {
    // Get colors - use productColors if available
    const productColors = project.productColors || [];

    // Get earliest delivery date from PO numbers
    const deliveryDate = project.poNumbers
        ?.filter(po => po.deliveryDate)
        .map(po => po.deliveryDate!)
        .sort()[0];

    // Format date - "30 MAR 2026" style
    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const day = date.getDate().toString().padStart(2, '0');
            const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
            const year = date.getFullYear();
            return `${day} ${month} ${year}`;
        } catch {
            return dateStr;
        }
    };

    // Get style code (first part of title or generate from ID)
    const styleCode = project.title.split(' ')[0] || project.id.slice(-6).toUpperCase();

    // Get all PO numbers for display (comma-separated)
    const allPONumbers = project.poNumbers?.map(po => po.number).filter(Boolean).join(', ') || '';

    // Style number format
    const styleNumber = styleCode;

    // Is this a new project? (created within last 7 days)
    const isNew = () => {
        try {
            const created = new Date(project.updatedAt);
            const now = new Date();
            const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
            return diffDays < 7;
        } catch {
            return false;
        }
    };

    // Auto-detect current production stage
    const getProjectStage = (): ProductionStage | null => {
        if (project.inspections && project.inspections.length > 0) return 'QC Inspection';
        if (project.invoices && project.invoices.length > 0) return 'Commercial';
        if (project.materialControl && project.materialControl.length > 0) return 'MQ Control';
        if (project.ppMeetings && project.ppMeetings.length > 0) return 'PP Meeting';
        if (project.consumption && (project.consumption.yarnItems?.length > 0 || project.consumption.accessoryItems?.length > 0)) return 'Consumption';
        if (project.orderSheet) return 'Order Sheet';
        if (project.pages && project.pages.length > 0) return 'Tech Pack';
        return null;
    };

    const mainStatus: MainStatus = project.mainStatus || 'DEVELOPMENT';
    const productionStage = getProjectStage();

    // Status color based on main status
    const getStatusColor = () => {
        switch (mainStatus) {
            case 'PRODUCTION': return '#2D8A4E';
            case 'FINALIZED': return '#1D4ED8';
            case 'CANCELLED': return '#DC2626';
            case 'PRE-PRODUCTION': return '#D97706';
            case 'DEVELOPMENT': return '#6B7280';
            default: return '#888888';
        }
    };

    return (
        <div
            onClick={onClick}
            className="group cursor-pointer flex flex-col bg-white"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' }}
        >
            {/* Image Area */}
            <div
                className="relative overflow-hidden"
                style={{
                    backgroundColor: '#EBEBEB',
                    aspectRatio: '4 / 5'
                }}
            >
                {project.productImage ? (
                    <img
                        src={project.productImage}
                        alt={project.title}
                        className="w-full h-full object-contain object-center p-4 transition-transform duration-400 ease-out group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                )}

                {/* Hover Overlay with Edit/Delete Buttons */}
                {(onEdit || onDelete) && (
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onEdit && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(e); }}
                                className="w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors"
                                title="Edit Style"
                            >
                                <Edit3 className="w-4 h-4 text-gray-700" />
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(e); }}
                                className="w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-red-50 transition-colors"
                                title="Delete Style"
                            >
                                <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                        )}
                    </div>
                )}

                {/* NEW Badge */}
                {isNew() && (
                    <div
                        className="absolute bottom-2 left-2 bg-white px-1.5 py-0.5"
                        style={{ fontSize: '9px', fontWeight: 700 }}
                    >
                        NEW
                    </div>
                )}
            </div>

            {/* Text Area */}
            <div className="px-3 py-2" style={{ backgroundColor: '#FFFFFF' }}>
                {/* Style Number - Bold uppercase 12px */}
                <div
                    className="text-black truncate"
                    style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px'
                    }}
                >
                    {styleNumber}
                </div>

                {/* Description - Gray uppercase 11px truncated */}
                <div
                    className="truncate mt-0.5"
                    style={{
                        fontSize: '11px',
                        fontWeight: 400,
                        color: '#444444',
                        textTransform: 'uppercase'
                    }}
                >
                    {project.title}
                </div>

                {/* PO Numbers - Show all comma-separated */}
                {allPONumbers && (
                    <div
                        className="truncate mt-1"
                        style={{
                            fontSize: '10px',
                            fontWeight: 400,
                            color: '#666666'
                        }}
                    >
                        PO: {allPONumbers}
                    </div>
                )}

                {/* Color Swatches - Square 16x16 with border */}
                {productColors.length > 0 && (
                    <div className="flex gap-1 mt-2">
                        {productColors.slice(0, 5).map((color) => (
                            <div
                                key={color.id}
                                style={{
                                    width: '16px',
                                    height: '16px',
                                    backgroundColor: color.hex,
                                    border: '1px solid #D0D0D0'
                                }}
                                title={color.name || color.hex}
                            />
                        ))}
                    </div>
                )}

                {/* Status - Main Stage */}
                <div
                    className="mt-2"
                    style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: getStatusColor(),
                        textTransform: 'uppercase'
                    }}
                >
                    {mainStatus}
                </div>

                {/* Production Sub-stage */}
                {mainStatus === 'PRODUCTION' && productionStage && (
                    <div
                        className="mt-0.5"
                        style={{
                            fontSize: '9px',
                            fontWeight: 500,
                            color: '#6B7280'
                        }}
                    >
                        └─ {productionStage}
                    </div>
                )}

                {/* Handover Date */}
                {deliveryDate && (
                    <div className="mt-1 flex gap-2" style={{ fontSize: '10px' }}>
                        <span style={{ color: '#888888', fontWeight: 400 }}>HANDOVER</span>
                        <span style={{ color: '#000000', fontWeight: 400 }}>{formatDate(deliveryDate)}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StyleCard;
