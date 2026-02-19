/**
 * Profile Page - User profile view and edit
 */
import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Camera, Lock, Save, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import * as authService from '../services/authService';
import { ROLE_LABELS } from '../constants/permissionConstants';
import ROUTES from '../router/routes';
import LoadingSpinner from '../components/LoadingSpinner';

const ProfilePage: React.FC = () => {
    useDocumentTitle('My Profile');
    const navigate = useNavigate();
    const { user, profile, userRole, refreshProfile } = useAuth();

    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
    });

    // Password change state
    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: '',
    });
    const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

    useEffect(() => {
        if (profile) {
            setFormData({
                name: profile.name || '',
                phone: profile.phone || '',
            });
        } else if (user) {
            setFormData({
                name: user.fullName || '',
                phone: '',
            });
        }
    }, [profile, user]);

    const handleSave = async () => {
        if (!user?.id) return;

        setIsSaving(true);
        setMessage(null);

        try {
            const result = await authService.updateProfile(user.id, {
                name: formData.name,
                phone: formData.phone,
            });

            if (result.success) {
                await refreshProfile();
                setIsEditing(false);
                setMessage({ type: 'success', text: 'Profile updated successfully!' });
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to update profile' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An error occurred while saving' });
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordChange = async () => {
        setPasswordErrors([]);
        setMessage(null);

        // Validate
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordErrors(['Passwords do not match']);
            return;
        }

        const validation = authService.validatePassword(passwordData.newPassword);
        if (!validation.valid) {
            setPasswordErrors(validation.errors);
            return;
        }

        setIsSaving(true);

        try {
            const result = await authService.updatePassword(passwordData.newPassword);

            if (result.error) {
                setPasswordErrors([result.error]);
            } else {
                setMessage({ type: 'success', text: 'Password updated successfully!' });
                setPasswordData({ newPassword: '', confirmPassword: '' });
                setIsChangingPassword(false);
            }
        } catch (err) {
            setPasswordErrors(['An error occurred while updating password']);
        } finally {
            setIsSaving(false);
        }
    };

    if (!user) {
        return <LoadingSpinner message="Loading profile..." />;
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
                <h1 style={{ fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    My Profile
                </h1>
            </header>

            <div className="max-w-2xl mx-auto p-6">
                {/* Message */}
                {message && (
                    <div
                        className="mb-6 p-4"
                        style={{
                            backgroundColor: message.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                            border: `1px solid ${message.type === 'success' ? '#10B981' : '#EF4444'}`,
                            color: message.type === 'success' ? '#047857' : '#DC2626',
                            fontSize: '13px'
                        }}
                    >
                        {message.text}
                    </div>
                )}

                {/* Profile Card */}
                <div className="bg-white shadow-lg" style={{ border: '1px solid #E0E0E0' }}>
                    {/* Avatar & Role Section */}
                    <div className="p-6 text-center" style={{ backgroundColor: '#FAFAFA', borderBottom: '1px solid #E0E0E0' }}>
                        <div
                            className="w-24 h-24 mx-auto mb-4 flex items-center justify-center relative"
                            style={{ backgroundColor: '#000000', borderRadius: '50%' }}
                        >
                            {profile?.profile_photo_url ? (
                                <img
                                    src={profile.profile_photo_url}
                                    alt="Profile"
                                    className="w-full h-full object-cover rounded-full"
                                />
                            ) : (
                                <User className="w-12 h-12 text-white" />
                            )}
                            <button
                                className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-100"
                                title="Change photo"
                            >
                                <Camera className="w-4 h-4" />
                            </button>
                        </div>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#000' }}>
                            {formData.name || user.email}
                        </h2>
                        <span
                            className="inline-block mt-2 px-3 py-1"
                            style={{
                                backgroundColor: '#000',
                                color: '#FFF',
                                fontSize: '11px',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}
                        >
                            {userRole ? ROLE_LABELS[userRole] : 'User'}
                        </span>
                    </div>

                    {/* Profile Form */}
                    <div className="p-6">
                        {/* Email (Read-only) */}
                        <div className="mb-4">
                            <label
                                className="block mb-2"
                                style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666' }}
                            >
                                <Mail className="w-4 h-4 inline mr-2" />
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={user.email}
                                disabled
                                className="w-full px-4 py-3 border bg-gray-50"
                                style={{ fontSize: '13px', borderColor: '#E0E0E0', color: '#666' }}
                            />
                            <p style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                                Contact an administrator to change your email
                            </p>
                        </div>

                        {/* Name */}
                        <div className="mb-4">
                            <label
                                className="block mb-2"
                                style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#333' }}
                            >
                                <User className="w-4 h-4 inline mr-2" />
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                disabled={!isEditing}
                                className={`w-full px-4 py-3 border transition-colors ${isEditing ? 'focus:outline-none focus:border-black' : 'bg-gray-50'}`}
                                style={{ fontSize: '13px', borderColor: '#E0E0E0' }}
                            />
                        </div>

                        {/* Phone */}
                        <div className="mb-4">
                            <label
                                className="block mb-2"
                                style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#333' }}
                            >
                                <Phone className="w-4 h-4 inline mr-2" />
                                Phone Number
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                disabled={!isEditing}
                                placeholder="Enter phone number"
                                className={`w-full px-4 py-3 border transition-colors ${isEditing ? 'focus:outline-none focus:border-black' : 'bg-gray-50'}`}
                                style={{ fontSize: '13px', borderColor: '#E0E0E0' }}
                            />
                        </div>

                        {/* Factory (Read-only) */}
                        {profile?.factory_id && (
                            <div className="mb-4">
                                <label
                                    className="block mb-2"
                                    style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666' }}
                                >
                                    Factory
                                </label>
                                <input
                                    type="text"
                                    value={profile.factory_id}
                                    disabled
                                    className="w-full px-4 py-3 border bg-gray-50"
                                    style={{ fontSize: '13px', borderColor: '#E0E0E0', color: '#666' }}
                                />
                            </div>
                        )}

                        {/* Edit/Save Buttons */}
                        <div className="flex gap-3 mt-6">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="flex-1 py-3 border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                                        style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}
                                        disabled={isSaving}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="flex-1 py-3 bg-black text-white hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                                        style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}
                                        disabled={isSaving}
                                    >
                                        <Save className="w-4 h-4" />
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="flex-1 py-3 bg-black text-white hover:bg-gray-800 transition-colors"
                                    style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}
                                >
                                    Edit Profile
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Password Change Section */}
                <div className="bg-white shadow-lg mt-6" style={{ border: '1px solid #E0E0E0' }}>
                    <div className="p-6">
                        <h3 className="flex items-center gap-2 mb-4" style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <Lock className="w-4 h-4" />
                            Change Password
                        </h3>

                        {isChangingPassword ? (
                            <div>
                                {passwordErrors.length > 0 && (
                                    <div className="mb-4 p-3" style={{ backgroundColor: '#FEF2F2', border: '1px solid #EF4444' }}>
                                        {passwordErrors.map((err, i) => (
                                            <p key={i} style={{ fontSize: '12px', color: '#DC2626' }}>{err}</p>
                                        ))}
                                    </div>
                                )}

                                <div className="mb-4">
                                    <label
                                        className="block mb-2"
                                        style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#333' }}
                                    >
                                        New Password
                                    </label>
                                    <input
                                        type="password"
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        className="w-full px-4 py-3 border focus:outline-none focus:border-black transition-colors"
                                        style={{ fontSize: '13px', borderColor: '#E0E0E0' }}
                                        placeholder="Min 8 chars, 1 uppercase, 1 number, 1 special"
                                    />
                                </div>

                                <div className="mb-4">
                                    <label
                                        className="block mb-2"
                                        style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#333' }}
                                    >
                                        Confirm Password
                                    </label>
                                    <input
                                        type="password"
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        className="w-full px-4 py-3 border focus:outline-none focus:border-black transition-colors"
                                        style={{ fontSize: '13px', borderColor: '#E0E0E0' }}
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setIsChangingPassword(false);
                                            setPasswordData({ newPassword: '', confirmPassword: '' });
                                            setPasswordErrors([]);
                                        }}
                                        className="flex-1 py-3 border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                                        style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}
                                        disabled={isSaving}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handlePasswordChange}
                                        className="flex-1 py-3 bg-black text-white hover:bg-gray-800 transition-colors"
                                        style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? 'Updating...' : 'Update Password'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsChangingPassword(true)}
                                className="w-full py-3 border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                                style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}
                            >
                                Change Password
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
