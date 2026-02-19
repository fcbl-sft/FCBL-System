/**
 * Role Management Page - Super Admin only
 * View and manage roles
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, Edit2, AlertCircle, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { RoleConfig, SectionId } from '../../types';
import * as roleService from '../services/roleService';
import { SECTION_LABELS, ALL_SECTIONS, ROLE_LABELS } from '../constants/permissionConstants';
import ROUTES from '../router/routes';
import LoadingSpinner from '../components/LoadingSpinner';

const RoleManagementPage: React.FC = () => {
    useDocumentTitle('Role Management');
    const navigate = useNavigate();
    const { userRole } = useAuth();

    const [roles, setRoles] = useState<RoleConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingRole, setEditingRole] = useState<RoleConfig | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Check if user is super admin
    if (userRole !== 'super_admin') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div
                    className="text-center p-8 bg-white shadow-lg"
                    style={{ maxWidth: '400px', border: '1px solid #E0E0E0' }}
                >
                    <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#DC2626', marginBottom: '16px' }}>
                        Access Denied
                    </h1>
                    <p style={{ fontSize: '13px', color: '#666' }}>
                        Only Super Admins can manage roles.
                    </p>
                </div>
            </div>
        );
    }

    // Load roles
    useEffect(() => {
        loadRoles();
    }, []);

    const loadRoles = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await roleService.getAllRoles();
            setRoles(data);
        } catch (err) {
            setError('Failed to load roles');
        } finally {
            setIsLoading(false);
        }
    };

    // Save role changes
    const handleSaveRole = async () => {
        if (!editingRole) return;

        setIsSaving(true);
        setMessage(null);

        try {
            const result = await roleService.updateRole(editingRole.id, {
                description: editingRole.description,
                default_sections: editingRole.default_sections,
            });

            if (result.success) {
                setRoles(prev => prev.map(r =>
                    r.id === editingRole.id ? editingRole : r
                ));
                setEditingRole(null);
                setMessage({ type: 'success', text: 'Role updated successfully' });
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to update role' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An error occurred' });
        } finally {
            setIsSaving(false);
        }
    };

    // Update section access for editing role
    const toggleSectionAccess = (section: SectionId) => {
        if (!editingRole) return;

        const currentAccess = editingRole.default_sections[section];
        let newAccess: 'full' | 'view' | 'none';

        // Cycle through: none -> view -> full -> none
        if (currentAccess === 'none') newAccess = 'view';
        else if (currentAccess === 'view') newAccess = 'full';
        else newAccess = 'none';

        setEditingRole({
            ...editingRole,
            default_sections: {
                ...editingRole.default_sections,
                [section]: newAccess,
            },
        });
    };

    if (isLoading) {
        return <LoadingSpinner message="Loading roles..." />;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white px-6 py-4 flex items-center gap-4" style={{ borderBottom: '1px solid #E0E0E0' }}>
                <button
                    onClick={() => navigate(ROUTES.DASHBOARD)}
                    className="p-2 hover:bg-gray-100 transition-colors"
                    style={{ color: '#000000' }}
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    <h1 style={{ fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Role Management
                    </h1>
                </div>
            </header>

            <div className="p-6">
                {/* Message */}
                {message && (
                    <div
                        className="mb-6 p-4 flex items-center gap-2"
                        style={{
                            backgroundColor: message.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                            border: `1px solid ${message.type === 'success' ? '#10B981' : '#EF4444'}`,
                            color: message.type === 'success' ? '#047857' : '#DC2626',
                            fontSize: '13px'
                        }}
                    >
                        <AlertCircle className="w-4 h-4" />
                        {message.text}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div
                        className="mb-6 p-4 flex items-center gap-2"
                        style={{ backgroundColor: '#FEF2F2', border: '1px solid #EF4444', color: '#DC2626', fontSize: '13px' }}
                    >
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                {/* Info Banner */}
                <div
                    className="mb-6 p-4"
                    style={{ backgroundColor: '#FEF3C7', border: '1px solid #F59E0B', fontSize: '13px', color: '#92400E' }}
                >
                    <strong>Note:</strong> System roles (Super Admin, Admin, Director, Merchandiser, QC, Viewer) cannot be deleted.
                    You can only modify their default section permissions.
                </div>

                {/* Roles List */}
                <div className="space-y-4">
                    {roles.map(role => (
                        <div
                            key={role.id}
                            className="bg-white shadow-lg"
                            style={{ border: '1px solid #E0E0E0' }}
                        >
                            {/* Role Header */}
                            <div
                                className="p-4 flex items-center justify-between"
                                style={{ backgroundColor: '#FAFAFA', borderBottom: '1px solid #E0E0E0' }}
                            >
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            {ROLE_LABELS[role.name as keyof typeof ROLE_LABELS] || role.name}
                                        </h3>
                                        {role.is_system && (
                                            <span
                                                className="px-2 py-0.5"
                                                style={{
                                                    backgroundColor: '#E5E7EB',
                                                    fontSize: '10px',
                                                    fontWeight: 600,
                                                    color: '#6B7280',
                                                    textTransform: 'uppercase'
                                                }}
                                            >
                                                System
                                            </span>
                                        )}
                                    </div>
                                    <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                        {editingRole?.id === role.id
                                            ? (
                                                <input
                                                    type="text"
                                                    value={editingRole.description}
                                                    onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                                                    className="w-full px-2 py-1 border focus:outline-none focus:border-black"
                                                    style={{ fontSize: '12px' }}
                                                />
                                            )
                                            : role.description
                                        }
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {editingRole?.id === role.id ? (
                                        <>
                                            <button
                                                onClick={() => setEditingRole(null)}
                                                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Cancel"
                                                disabled={isSaving}
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={handleSaveRole}
                                                className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                                title="Save"
                                                disabled={isSaving}
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => setEditingRole({ ...role })}
                                            className="p-2 text-gray-600 hover:text-black hover:bg-gray-100 rounded transition-colors"
                                            title="Edit Role"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Section Access Grid */}
                            <div className="p-4">
                                <h4 className="mb-3" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666' }}>
                                    Default Section Access
                                </h4>
                                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                    {(ALL_SECTIONS as readonly SectionId[]).map(section => {
                                        const currentRole = editingRole?.id === role.id ? editingRole : role;
                                        const access = currentRole.default_sections[section] || 'none';
                                        const isEditing = editingRole?.id === role.id;

                                        return (
                                            <button
                                                key={section}
                                                onClick={() => isEditing && toggleSectionAccess(section)}
                                                className={`p-2 text-center rounded transition-colors ${isEditing ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                                                style={{
                                                    backgroundColor: access === 'full'
                                                        ? '#DCFCE7'
                                                        : access === 'view'
                                                            ? '#FEF3C7'
                                                            : '#F3F4F6',
                                                    border: `1px solid ${access === 'full'
                                                            ? '#22C55E'
                                                            : access === 'view'
                                                                ? '#F59E0B'
                                                                : '#E5E7EB'
                                                        }`,
                                                }}
                                                disabled={!isEditing}
                                            >
                                                <div style={{
                                                    fontSize: '10px',
                                                    fontWeight: 600,
                                                    color: access === 'full'
                                                        ? '#166534'
                                                        : access === 'view'
                                                            ? '#92400E'
                                                            : '#6B7280',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px'
                                                }}>
                                                    {SECTION_LABELS[section]}
                                                </div>
                                                <div style={{
                                                    fontSize: '9px',
                                                    marginTop: '4px',
                                                    color: access === 'full'
                                                        ? '#15803D'
                                                        : access === 'view'
                                                            ? '#B45309'
                                                            : '#9CA3AF'
                                                }}>
                                                    {access === 'full' ? 'Full' : access === 'view' ? 'View' : 'None'}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Empty State */}
                {roles.length === 0 && !error && (
                    <div
                        className="text-center py-12 bg-white"
                        style={{ border: '1px solid #E0E0E0' }}
                    >
                        <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p style={{ fontSize: '14px', color: '#666' }}>No roles found</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoleManagementPage;
