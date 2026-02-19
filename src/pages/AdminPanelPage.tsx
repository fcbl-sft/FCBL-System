/**
 * Admin Panel Page - Dashboard for admin functions
 * Shows overview cards for Users, Roles, Factories, and Activity Logs
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Shield, Factory, Activity, Plus, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import ROUTES from '../router/routes';
import * as userService from '../services/userService';
import * as roleService from '../services/roleService';

const AdminPanelPage: React.FC = () => {
    useDocumentTitle('Admin Panel');
    const navigate = useNavigate();
    const { userRole, profile } = useAuth();

    const [userCount, setUserCount] = useState<number>(0);
    const [roleCount, setRoleCount] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);

    // Check access
    const canAccessAdmin = userRole === 'super_admin' || userRole === 'admin';
    const canManageRoles = userRole === 'super_admin';

    useEffect(() => {
        loadCounts();
    }, []);

    const loadCounts = async () => {
        setIsLoading(true);
        try {
            const [users, roles] = await Promise.all([
                userService.getAllUsers(),
                roleService.getAllRoles()
            ]);
            setUserCount(users.length);
            setRoleCount(roles.length);
        } catch (err) {
            console.error('Failed to load admin counts:', err);
        } finally {
            setIsLoading(false);
        }
    };

    if (!canAccessAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div
                    className="text-center p-8 bg-white shadow-lg"
                    style={{ maxWidth: '400px', border: '1px solid #E0E0E0' }}
                >
                    <Shield className="w-12 h-12 mx-auto mb-4 text-red-500" />
                    <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#DC2626', marginBottom: '16px' }}>
                        Access Denied
                    </h1>
                    <p style={{ fontSize: '13px', color: '#666' }}>
                        Only Admins and Super Admins can access the Admin Panel.
                    </p>
                    <button
                        onClick={() => navigate(ROUTES.DASHBOARD)}
                        className="mt-4 px-4 py-2 bg-black text-white text-sm font-medium rounded hover:bg-gray-800"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white px-6 py-4 flex items-center gap-4" style={{ borderBottom: '1px solid #E0E0E0' }}>
                <button
                    onClick={() => navigate(ROUTES.DASHBOARD)}
                    className="p-2 hover:bg-gray-100 transition-colors rounded"
                    style={{ color: '#000000' }}
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    <h1 style={{ fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Admin Control Panel
                    </h1>
                </div>
            </header>

            <div className="p-6">
                {/* Welcome Banner */}
                <div
                    className="mb-6 p-6 bg-white shadow-sm"
                    style={{ border: '1px solid #E0E0E0' }}
                >
                    <h2 className="text-xl font-bold text-gray-900">
                        Welcome, {profile?.name || 'Admin'}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage users, roles, and system settings from this panel.
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {/* Users Card */}
                    <button
                        onClick={() => navigate('/admin/users')}
                        className="bg-white p-6 text-left hover:shadow-md transition-shadow group"
                        style={{ border: '1px solid #E0E0E0' }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div
                                className="w-12 h-12 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: '#E0F2FE' }}
                            >
                                <Users className="w-6 h-6 text-blue-600" />
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">
                            {isLoading ? '...' : userCount}
                        </h3>
                        <p className="text-sm text-gray-500">Total Users</p>
                    </button>

                    {/* Roles Card */}
                    <button
                        onClick={() => canManageRoles && navigate('/admin/roles')}
                        className={`bg-white p-6 text-left transition-shadow ${canManageRoles ? 'hover:shadow-md group cursor-pointer' : 'cursor-not-allowed opacity-75'}`}
                        style={{ border: '1px solid #E0E0E0' }}
                        disabled={!canManageRoles}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div
                                className="w-12 h-12 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: '#FEF3C7' }}
                            >
                                <Shield className="w-6 h-6 text-amber-600" />
                            </div>
                            {canManageRoles && <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />}
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">
                            {isLoading ? '...' : roleCount}
                        </h3>
                        <p className="text-sm text-gray-500">
                            Roles {!canManageRoles && '(Super Admin only)'}
                        </p>
                    </button>

                    {/* Factories Card */}
                    <div
                        className="bg-white p-6 text-left opacity-50 cursor-not-allowed"
                        style={{ border: '1px solid #E0E0E0' }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div
                                className="w-12 h-12 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: '#DCFCE7' }}
                            >
                                <Factory className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">-</h3>
                        <p className="text-sm text-gray-500">Factories (Coming Soon)</p>
                    </div>

                    {/* Activity Logs Card */}
                    <button
                        onClick={() => navigate('/admin/logs')}
                        className="bg-white p-6 text-left hover:shadow-md transition-shadow group"
                        style={{ border: '1px solid #E0E0E0' }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div
                                className="w-12 h-12 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: '#F3E8FF' }}
                            >
                                <Activity className="w-6 h-6 text-purple-600" />
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-900">View</h3>
                        <p className="text-sm text-gray-500">Activity Logs</p>
                    </button>
                </div>

                {/* Quick Actions */}
                <div
                    className="bg-white p-6"
                    style={{ border: '1px solid #E0E0E0' }}
                >
                    <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => navigate('/admin/users')}
                            className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium rounded hover:bg-gray-800"
                        >
                            <Users className="w-4 h-4" />
                            Manage Users
                        </button>
                        {canManageRoles && (
                            <button
                                onClick={() => navigate('/admin/roles')}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded hover:bg-gray-200"
                            >
                                <Shield className="w-4 h-4" />
                                Manage Roles
                            </button>
                        )}
                        <button
                            onClick={() => navigate('/admin/logs')}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded hover:bg-gray-200"
                        >
                            <Activity className="w-4 h-4" />
                            View Logs
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPanelPage;
