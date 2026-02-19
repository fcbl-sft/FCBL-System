/**
 * Activity Logs Page - View login and action history
 * Shows all login attempts with filtering capabilities
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, Search, Filter, CheckCircle, XCircle, Lock, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { supabase } from '../../lib/supabase';
import { LoginActivity } from '../../types';
import LoadingSpinner from '../components/LoadingSpinner';

const ActivityLogsPage: React.FC = () => {
    useDocumentTitle('Activity Logs');
    const navigate = useNavigate();
    const { userRole } = useAuth();

    const [logs, setLogs] = useState<LoginActivity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Check access
    const canAccessLogs = userRole === 'super_admin' || userRole === 'admin';

    useEffect(() => {
        if (canAccessLogs) {
            loadLogs();
        }
    }, [canAccessLogs]);

    const loadLogs = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('login_activity')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(100);

            if (error) throw error;
            setLogs(data || []);
        } catch (err: any) {
            console.error('Failed to load logs:', err);
            setError(err.message || 'Failed to load activity logs');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch = log.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.ip_address || '').includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'failed':
                return <XCircle className="w-4 h-4 text-red-500" />;
            case 'locked':
                return <Lock className="w-4 h-4 text-orange-500" />;
            default:
                return null;
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            success: 'bg-green-100 text-green-800',
            failed: 'bg-red-100 text-red-800',
            locked: 'bg-orange-100 text-orange-800'
        };
        return (
            <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    if (!canAccessLogs) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div
                    className="text-center p-8 bg-white shadow-lg"
                    style={{ maxWidth: '400px', border: '1px solid #E0E0E0' }}
                >
                    <Activity className="w-12 h-12 mx-auto mb-4 text-red-500" />
                    <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#DC2626', marginBottom: '16px' }}>
                        Access Denied
                    </h1>
                    <p style={{ fontSize: '13px', color: '#666' }}>
                        Only Admins and Super Admins can access Activity Logs.
                    </p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return <LoadingSpinner message="Loading activity logs..." />;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #E0E0E0' }}>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin')}
                        className="p-2 hover:bg-gray-100 transition-colors rounded"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        <h1 style={{ fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Admin Panel &gt; Activity Logs
                        </h1>
                    </div>
                </div>
                <button
                    onClick={loadLogs}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </header>

            <div className="p-6">
                {/* Error */}
                {error && (
                    <div
                        className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded"
                    >
                        {error}
                    </div>
                )}

                {/* Filters */}
                <div
                    className="mb-6 p-4 bg-white flex items-center gap-4 flex-wrap"
                    style={{ border: '1px solid #E0E0E0' }}
                >
                    {/* Search */}
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by email or IP..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1 text-sm outline-none"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="text-sm border border-gray-200 rounded px-2 py-1 outline-none focus:border-black"
                        >
                            <option value="all">All Status</option>
                            <option value="success">Success</option>
                            <option value="failed">Failed</option>
                            <option value="locked">Locked</option>
                        </select>
                    </div>
                </div>

                {/* Logs Table */}
                <div
                    className="bg-white overflow-hidden"
                    style={{ border: '1px solid #E0E0E0' }}
                >
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-4 py-3 text-xs font-bold uppercase text-gray-600">Timestamp</th>
                                <th className="text-left px-4 py-3 text-xs font-bold uppercase text-gray-600">User</th>
                                <th className="text-left px-4 py-3 text-xs font-bold uppercase text-gray-600">Status</th>
                                <th className="text-left px-4 py-3 text-xs font-bold uppercase text-gray-600">IP Address</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.length > 0 ? (
                                filteredLogs.map(log => (
                                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {formatDate(log.timestamp)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {log.email}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(log.status)}
                                                {getStatusBadge(log.status)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                                            {log.ip_address || '-'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500 text-sm">
                                        No activity logs found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Stats */}
                <div className="mt-4 text-sm text-gray-500">
                    Showing {filteredLogs.length} of {logs.length} entries
                </div>
            </div>
        </div>
    );
};

export default ActivityLogsPage;
