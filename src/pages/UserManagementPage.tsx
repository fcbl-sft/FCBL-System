/**
 * User Management Page - Admin only
 * List, create, edit, delete users
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, Edit2, Trash2, Key, ToggleLeft, ToggleRight, ArrowLeft, AlertCircle } from 'lucide-react';
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

    // Delete user
    const handleDelete = async (user: UserProfile) => {
        if (user.role === 'super_admin') {
            setMessage({ type: 'error', text: 'Cannot delete Super Admin users' });
            return;
        }

        if (!confirm(`Are you sure you want to delete ${user.name || user.email}?`)) return;

        setActionLoading(user.id);
        setMessage(null);

        try {
            const result = await userService.deleteUser(user.id);
            if (result.success) {
                setUsers(prev => prev.filter(u => u.id !== user.id));
                setMessage({ type: 'success', text: 'User deleted successfully' });
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to delete user' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An error occurred' });
        } finally {
            setActionLoading(null);
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
            {/* Header */}
            <header className="bg-white px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #E0E0E0' }}>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(ROUTES.DASHBOARD)}
                        className="p-2 hover:bg-gray-100 transition-colors"
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
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-gray-800 transition-colors"
                    style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}
                >
                    <Plus className="w-4 h-4" />
                    Add User
                </button>
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

                {/* Filters */}
                <div className="bg-white p-4 mb-6 flex gap-4 flex-wrap" style={{ border: '1px solid #E0E0E0' }}>
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border focus:outline-none focus:border-black transition-colors"
                            style={{ fontSize: '13px', borderColor: '#E0E0E0' }}
                        />
                    </div>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
                        className="px-4 py-2 border focus:outline-none focus:border-black"
                        style={{ fontSize: '13px', borderColor: '#E0E0E0', minWidth: '150px' }}
                    >
                        <option value="all">All Roles</option>
                        {ALL_ROLES.map(role => (
                            <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                        ))}
                    </select>
                </div>

                {/* Users Table */}
                <div className="bg-white shadow-lg overflow-hidden" style={{ border: '1px solid #E0E0E0' }}>
                    <table className="w-full">
                        <thead>
                            <tr style={{ backgroundColor: '#FAFAFA', borderBottom: '1px solid #E0E0E0' }}>
                                <th className="px-4 py-3 text-left" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666' }}>
                                    User
                                </th>
                                <th className="px-4 py-3 text-left" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666' }}>
                                    Role
                                </th>
                                <th className="px-4 py-3 text-center" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666' }}>
                                    Status
                                </th>
                                <th className="px-4 py-3 text-left" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666' }}>
                                    Created
                                </th>
                                <th className="px-4 py-3 text-right" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666' }}>
                                    Actions
                                </th>
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
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#000' }}>
                                                    {user.name || 'No name'}
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#666' }}>
                                                    {user.email}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className="inline-block px-2 py-1"
                                                style={{
                                                    backgroundColor: user.role === 'super_admin' ? '#000' : '#F3F4F6',
                                                    color: user.role === 'super_admin' ? '#FFF' : '#374151',
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px'
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
                                                    fontSize: '10px',
                                                    fontWeight: 600,
                                                    textTransform: 'uppercase'
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
                                                            {user.is_active ? (
                                                                <ToggleRight className="w-4 h-4" />
                                                            ) : (
                                                                <ToggleLeft className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                        {user.role !== 'super_admin' && (
                                                            <button
                                                                onClick={() => handleDelete(user)}
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

                {/* Summary */}
                <div className="mt-4 text-right" style={{ fontSize: '12px', color: '#666' }}>
                    Showing {filteredUsers.length} of {users.length} users
                </div>
            </div>
        </div>
    );
};

export default UserManagementPage;
