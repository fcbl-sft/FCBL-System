/**
 * User Management Page - Admin only
 * List, create, edit, delete users
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, Edit2, Trash2, Key, ToggleLeft, ToggleRight, ArrowLeft, AlertCircle, AlertTriangle, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { UserProfile, UserRole } from '../../types';
import * as userService from '../services/userService';
import { ROLE_LABELS, ALL_ROLES } from '../constants/permissionConstants';
import ROUTES from '../router/routes';
import LoadingSpinner from '../components/LoadingSpinner';

const UserManagementPage: React.FC = () => {
    useDocumentTitle('User Management');
    const navigate = useNavigate();
    const { userRole } = useAuth();

    const [users, setUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Confirmation modal state
    const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Load users
    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await userService.getAllUsers();
            setUsers(data);
        } catch (err) {
            setError('Failed to load users');
        } finally {
            setIsLoading(false);
        }
    };

    // Filter users
    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    // Toggle user active status
    const handleToggleActive = async (user: UserProfile) => {
        setActionLoading(user.id);
        setMessage(null);

        try {
            const result = await userService.toggleUserActive(user.id, !user.is_active);
            if (result.success) {
                setUsers(prev => prev.map(u =>
                    u.id === user.id ? { ...u, is_active: !u.is_active } : u
                ));
                setMessage({
                    type: 'success',
                    text: `User ${user.is_active ? 'disabled' : 'enabled'} successfully`
                });
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to update user' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An error occurred' });
        } finally {
            setActionLoading(null);
        }
    };

    // Reset password
    const handleResetPassword = async (user: UserProfile) => {
        if (!confirm(`Send password reset email to ${user.email}?`)) return;

        setActionLoading(user.id);
        setMessage(null);

        try {
            const result = await userService.resetUserPassword(user.email);
            if (result.success) {
                setMessage({ type: 'success', text: 'Password reset email sent' });
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to send reset email' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An error occurred' });
        } finally {
            setActionLoading(null);
        }
    };

    // Open delete confirmation modal
    const handleDeleteClick = (user: UserProfile) => {
        if (user.role === 'super_admin') {
            setMessage({ type: 'error', text: 'Cannot delete Super Admin users' });
            return;
        }
        setDeleteTarget(user);
        setMessage(null);
    };

    // Confirm and execute permanent delete
    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;

        setIsDeleting(true);
        try {
            const result = await userService.deleteUser(deleteTarget.id);
            if (result.success) {
                setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
                setMessage({ type: 'success', text: `${deleteTarget.name || deleteTarget.email} has been permanently deleted` });
                setDeleteTarget(null);
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to delete user' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An error occurred while deleting the user' });
        } finally {
            setIsDeleting(false);
        }
    };

    // Can current user manage this user?
    const canManageUser = (user: UserProfile) => {
        if (userRole === 'super_admin') return true;
        if (userRole === 'admin' && user.role !== 'super_admin') return true;
        return false;
    };

    if (isLoading) {
        return <LoadingSpinner message="Loading users..." />;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* ── Delete Confirmation Modal ── */}
            {deleteTarget && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                    onClick={() => !isDeleting && setDeleteTarget(null)}
                >
                    <div
                        className="bg-white w-full max-w-md shadow-2xl"
                        style={{ border: '1px solid #E0E0E0' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #E0E0E0', backgroundColor: '#FEF2F2' }}>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                                    <AlertTriangle className="w-4 h-4 text-red-600" />
                                </div>
                                <h2 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#DC2626' }}>
                                    Delete User
                                </h2>
                            </div>
                            {!isDeleting && (
                                <button
                                    onClick={() => setDeleteTarget(null)}
                                    className="p-1 hover:bg-red-100 rounded transition-colors"
                                    style={{ color: '#DC2626' }}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Modal Body */}
                        <div className="px-6 py-5">
                            <p style={{ fontSize: '14px', color: '#111', marginBottom: '12px' }}>
                                Are you sure you want to permanently delete this user? This action <strong>cannot be undone</strong>.
                            </p>

                            {/* User Info Card */}
                            <div className="p-4 rounded" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E0E0E0', marginBottom: '16px' }}>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#000', marginBottom: '2px' }}>
                                    {deleteTarget.name || 'No name'}
                                </div>
                                <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>
                                    {deleteTarget.email}
                                </div>
                                <span
                                    className="inline-block px-2 py-0.5"
                                    style={{
                                        backgroundColor: '#F3F4F6',
                                        color: '#374151',
                                        fontSize: '10px',
                                        fontWeight: 600,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}
                                >
                                    {ROLE_LABELS[deleteTarget.role] || deleteTarget.role}
                                </span>
                            </div>

                            <p style={{ fontSize: '12px', color: '#DC2626' }}>
                                ⚠ The user will be removed from the system and will no longer be able to log in.
                            </p>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex gap-3 px-6 py-4" style={{ borderTop: '1px solid #E0E0E0' }}>
                            <button
                                onClick={() => setDeleteTarget(null)}
                                disabled={isDeleting}
                                className="flex-1 py-2.5 border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                                style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                disabled={isDeleting}
                                className="flex-1 py-2.5 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                                style={{
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    backgroundColor: '#DC2626',
                                    color: '#fff'
                                }}
                            >
                                {isDeleting ? (
                                    <>
                                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Delete Permanently
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="bg-white px-4 md:px-6 py-3 md:py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #E0E0E0' }}>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(ROUTES.DASHBOARD)}
                        className="p-2 hover:bg-gray-100 transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]"
                        style={{ color: '#000000' }}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        <h1 style={{ fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            User Management
                        </h1>
                    </div>
                </div>
                <button
                    onClick={() => navigate(ROUTES.USER_NEW)}
                    className="flex items-center gap-2 px-3 md:px-4 py-2 btn-primary transition-colors"
                    style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add User</span>
                    <span className="sm:hidden">Add</span>
                </button>
            </header>

            <div className="p-4 md:p-6">
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
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {message.text}
                        <button onClick={() => setMessage(null)} className="ml-auto p-1 hover:opacity-70">
                            <X className="w-3.5 h-3.5" />
                        </button>
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

                {/* Filters */}
                <div className="bg-white p-4 mb-6 flex gap-4 flex-wrap" style={{ border: '1px solid #E0E0E0' }}>
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border focus:outline-none focus:border-green-600 transition-colors"
                            style={{ fontSize: '13px', borderColor: '#E0E0E0' }}
                        />
                    </div>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
                        className="px-4 py-2 border focus:outline-none focus:border-green-600"
                        style={{ fontSize: '13px', borderColor: '#E0E0E0', minWidth: '150px' }}
                    >
                        <option value="all">All Roles</option>
                        {ALL_ROLES.map(role => (
                            <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                        ))}
                    </select>
                </div>

                {/* Desktop Users Table */}
                <div className="hidden md:block bg-white shadow-lg overflow-hidden" style={{ border: '1px solid #E0E0E0' }}>
                    <table className="w-full">
                        <thead>
                            <tr style={{ backgroundColor: '#FAFAFA', borderBottom: '1px solid #E0E0E0' }}>
                                <th className="px-4 py-3 text-left" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666' }}>User</th>
                                <th className="px-4 py-3 text-left" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666' }}>Role</th>
                                <th className="px-4 py-3 text-center" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666' }}>Status</th>
                                <th className="px-4 py-3 text-left" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666' }}>Created</th>
                                <th className="px-4 py-3 text-right" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center" style={{ color: '#666', fontSize: '13px' }}>
                                        No users found
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map(user => (
                                    <tr key={user.id} style={{ borderBottom: '1px solid #E0E0E0' }}>
                                        <td className="px-4 py-3">
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#000' }}>{user.name || 'No name'}</div>
                                                <div style={{ fontSize: '12px', color: '#666' }}>{user.email}</div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className="inline-block px-2 py-1"
                                                style={{
                                                    backgroundColor: user.role === 'super_admin' ? '#000' : '#F3F4F6',
                                                    color: user.role === 'super_admin' ? '#FFF' : '#374151',
                                                    fontSize: '11px', fontWeight: 600,
                                                    textTransform: 'uppercase', letterSpacing: '0.5px'
                                                }}
                                            >
                                                {ROLE_LABELS[user.role] || user.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span
                                                className="inline-block px-2 py-1 rounded-full"
                                                style={{
                                                    backgroundColor: user.is_active ? '#ECFDF5' : '#FEF2F2',
                                                    color: user.is_active ? '#047857' : '#DC2626',
                                                    fontSize: '10px', fontWeight: 600, textTransform: 'uppercase'
                                                }}
                                            >
                                                {user.is_active ? 'Active' : 'Disabled'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3" style={{ fontSize: '12px', color: '#666' }}>
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                {canManageUser(user) && (
                                                    <>
                                                        <button
                                                            onClick={() => navigate(`/admin/users/${user.id}/edit`)}
                                                            className="p-2 text-gray-600 hover:text-black hover:bg-gray-100 rounded transition-colors"
                                                            title="Edit User"
                                                            disabled={actionLoading === user.id}
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleResetPassword(user)}
                                                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                            title="Reset Password"
                                                            disabled={actionLoading === user.id}
                                                        >
                                                            <Key className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleToggleActive(user)}
                                                            className={`p-2 rounded transition-colors ${user.is_active
                                                                ? 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'
                                                                : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
                                                                }`}
                                                            title={user.is_active ? 'Disable User' : 'Enable User'}
                                                            disabled={actionLoading === user.id}
                                                        >
                                                            {user.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                                        </button>
                                                        {user.role !== 'super_admin' && (
                                                            <button
                                                                onClick={() => handleDeleteClick(user)}
                                                                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                title="Delete User"
                                                                disabled={actionLoading === user.id}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                    {filteredUsers.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 text-sm">No users found</div>
                    ) : (
                        filteredUsers.map(user => (
                            <div key={user.id} className="bg-white rounded-lg p-4" style={{ border: '1px solid #E0E0E0' }}>
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#000' }}>{user.name || 'No name'}</div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>{user.email}</div>
                                    </div>
                                    <span
                                        className="inline-block px-2 py-1"
                                        style={{
                                            backgroundColor: user.is_active ? '#ECFDF5' : '#FEF2F2',
                                            color: user.is_active ? '#047857' : '#DC2626',
                                            fontSize: '10px', fontWeight: 700, textTransform: 'uppercase'
                                        }}
                                    >
                                        {user.is_active ? 'Active' : 'Disabled'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span
                                        className="inline-block px-2 py-1"
                                        style={{
                                            backgroundColor: user.role === 'super_admin' ? '#000' : '#F3F4F6',
                                            color: user.role === 'super_admin' ? '#FFF' : '#374151',
                                            fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px'
                                        }}
                                    >
                                        {ROLE_LABELS[user.role] || user.role}
                                    </span>
                                    {canManageUser(user) && (
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => navigate(`/admin/users/${user.id}/edit`)} className="p-2 text-gray-600 hover:text-black hover:bg-gray-100 rounded" title="Edit" disabled={actionLoading === user.id}><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={() => handleResetPassword(user)} className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded" title="Reset Password" disabled={actionLoading === user.id}><Key className="w-4 h-4" /></button>
                                            <button onClick={() => handleToggleActive(user)} className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded" title={user.is_active ? 'Disable' : 'Enable'} disabled={actionLoading === user.id}>{user.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}</button>
                                            {user.role !== 'super_admin' && (
                                                <button onClick={() => handleDeleteClick(user)} className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded" title="Delete" disabled={actionLoading === user.id}><Trash2 className="w-4 h-4" /></button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Summary */}
                <div className="mt-4 text-right" style={{ fontSize: '12px', color: '#666' }}>
                    Showing {filteredUsers.length} of {users.length} users
                </div>
            </div>
        </div>
    );
};

export default UserManagementPage;
