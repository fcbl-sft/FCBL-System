/**
 * Settings Page - User settings and preferences
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, Bell, Lock, Globe, Moon } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import ROUTES from '../router/routes';

const SettingsPage: React.FC = () => {
    useDocumentTitle('Settings');
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white px-6 py-4 flex items-center gap-4" style={{ borderBottom: '1px solid #E0E0E0' }}>
                <button
                    onClick={() => navigate(ROUTES.DASHBOARD)}
                    className="p-2 hover:bg-gray-100 transition-colors rounded"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    <h1 style={{ fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Settings
                    </h1>
                </div>
            </header>

            <div className="p-6 max-w-2xl mx-auto">
                {/* Settings Sections */}
                <div className="space-y-4">
                    {/* Notifications */}
                    <div
                        className="bg-white p-6"
                        style={{ border: '1px solid #E0E0E0' }}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <Bell className="w-5 h-5 text-gray-600" />
                            <h2 className="font-bold text-gray-900">Notifications</h2>
                        </div>
                        <div className="space-y-3">
                            <label className="flex items-center justify-between">
                                <span className="text-sm text-gray-700">Email notifications</span>
                                <input type="checkbox" defaultChecked className="w-4 h-4" />
                            </label>
                            <label className="flex items-center justify-between">
                                <span className="text-sm text-gray-700">Push notifications</span>
                                <input type="checkbox" className="w-4 h-4" />
                            </label>
                        </div>
                    </div>

                    {/* Security */}
                    <div
                        className="bg-white p-6"
                        style={{ border: '1px solid #E0E0E0' }}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <Lock className="w-5 h-5 text-gray-600" />
                            <h2 className="font-bold text-gray-900">Security</h2>
                        </div>
                        <div className="space-y-3">
                            <button
                                onClick={() => navigate(ROUTES.PROFILE)}
                                className="text-sm text-blue-600 hover:text-blue-800"
                            >
                                Change password →
                            </button>
                            <p className="text-xs text-gray-500">
                                We recommend using a strong password with at least 8 characters.
                            </p>
                        </div>
                    </div>

                    {/* Language */}
                    <div
                        className="bg-white p-6"
                        style={{ border: '1px solid #E0E0E0' }}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <Globe className="w-5 h-5 text-gray-600" />
                            <h2 className="font-bold text-gray-900">Language</h2>
                        </div>
                        <select className="w-full border border-gray-200 rounded px-3 py-2 text-sm">
                            <option>English (US)</option>
                            <option>English (UK)</option>
                            <option>Spanish</option>
                            <option>Chinese</option>
                        </select>
                    </div>

                    {/* Appearance */}
                    <div
                        className="bg-white p-6"
                        style={{ border: '1px solid #E0E0E0' }}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <Moon className="w-5 h-5 text-gray-600" />
                            <h2 className="font-bold text-gray-900">Appearance</h2>
                        </div>
                        <select className="w-full border border-gray-200 rounded px-3 py-2 text-sm">
                            <option>Light</option>
                            <option>Dark</option>
                            <option>System</option>
                        </select>
                    </div>
                </div>

                {/* Save Button */}
                <div className="mt-6 flex justify-end">
                    <button
                        className="px-6 py-2 bg-black text-white text-sm font-medium rounded hover:bg-gray-800"
                    >
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
