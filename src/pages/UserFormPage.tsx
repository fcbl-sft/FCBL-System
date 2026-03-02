/**
 * User Form Page - Create/Edit user
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, User, Mail, Lock, Phone, Building, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { UserRole, SectionId, SectionAccessMap } from '../../types';
import * as userService from '../services/userService';
import { validatePassword, validateEmail } from '../services/authService';
import { ROLE_LABELS, ALL_SECTIONS, SECTION_LABELS, DEFAULT_ROLE_ACCESS, ASSIGNABLE_ROLES } from '../constants/permissionConstants';
import ROUTES from '../router/routes';
import LoadingSpinner from '../components/LoadingSpinner';

const UserFormPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const isEditing = !!id;
    useDocumentTitle(isEditing ? 'Edit User' : 'Create User');

    const navigate = useNavigate();
    const { userRole } = useAuth();

    const [isLoading, setIsLoading] = useState(isEditing);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    // Form data
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        name: '',
        role: 'viewer' as UserRole,
        phone: '',
        factory_id: '',
    });

    // Section access (custom overrides)
    const [sectionAccess, setSectionAccess] = useState<SectionAccessMap>(DEFAULT_ROLE_ACCESS['viewer']);
    const [useCustomAccess, setUseCustomAccess] = useState(false);

    // Load user for editing
    useEffect(() => {
        if (isEditing && id) {
            loadUser(id);
        }
    }, [id, isEditing]);

    const loadUser = async (userId: string) => {
        setIsLoading(true);
        try {
            const user = await userService.getUser(userId);
            if (user) {
                setFormData({
                    email: user.email,
                    password: '',
                    confirmPassword: '',
                    name: user.name || '',
                    role: user.role,
                    phone: user.phone || '',
                    factory_id: user.factory_id || '',
                });
                setSectionAccess(user.section_access || DEFAULT_ROLE_ACCESS[user.role]);
                setUseCustomAccess(JSON.stringify(user.section_access) !== JSON.stringify(DEFAULT_ROLE_ACCESS[user.role]));
            } else {
                setErrors(['User not found']);
            }
        } catch (err) {
            setErrors(['Failed to load user']);
        } finally {
            setIsLoading(false);
        }
    };

    // Update section access when role changes (if not using custom)
    useEffect(() => {
        if (!useCustomAccess) {
            setSectionAccess(DEFAULT_ROLE_ACCESS[formData.role]);
        }
    }, [formData.role, useCustomAccess]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors([]);

        // Validation
        const newErrors: string[] = [];

        if (!formData.name.trim()) {
            newErrors.push('Name is required');
        }

        if (!isEditing) {
            if (!formData.email.trim()) {
                newErrors.push('Email is required');
            } else if (!validateEmail(formData.email)) {
                newErrors.push('Invalid email format');
            }

            if (!formData.password) {
                newErrors.push('Password is required');
            } else {
                const pwdValidation = validatePassword(formData.password);
                if (!pwdValidation.valid) {
                    newErrors.push(...pwdValidation.errors);
                }
            }

            if (formData.password !== formData.confirmPassword) {
                newErrors.push('Passwords do not match');
            }
        }

        if (newErrors.length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsSaving(true);

        try {
            if (isEditing && id) {
                const result = await userService.updateUser(id, {
                    name: formData.name,
                    role: formData.role,
                    phone: formData.phone || undefined,
                    factory_id: formData.factory_id || undefined,
                    // Always send section_access - sectionAccess state always reflects current values
                    // (either role defaults or custom overrides, kept in sync via useEffect)
                    section_access: sectionAccess,
                });

                if (result.success) {
                    navigate(ROUTES.USER_MANAGEMENT);
                } else {
                    setErrors([result.error || 'Failed to update user']);
                }
            } else {
                const result = await userService.createUser({
                    email: formData.email,
                    password: formData.password,
                    name: formData.name,
                    role: formData.role,
                    phone: formData.phone || undefined,
                    factory_id: formData.factory_id || undefined,
                    section_access: useCustomAccess ? sectionAccess : undefined,
                });

                if (result.user) {
                    navigate(ROUTES.USER_MANAGEMENT);
                } else {
                    setErrors([result.error || 'Failed to create user']);
                }
            }
        } catch (err) {
            setErrors(['An error occurred']);
        } finally {
            setIsSaving(false);
        }
    };

    // Available roles based on current user
    const availableRoles = userRole === 'super_admin' ? ALL_SECTIONS : ASSIGNABLE_ROLES;

    // Sections that can be configured (exclude user/role management for non-super_admin)
    const configurableSections = ALL_SECTIONS.filter(section => {
        if (userRole !== 'super_admin' && (section === 'user_management' || section === 'role_management')) {
            return false;
        }
        return true;
    });

    if (isLoading) {
        return <LoadingSpinner message="Loading user..." />;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white px-6 py-4 flex items-center gap-4" style={{ borderBottom: '1px solid #E0E0E0' }}>
                <button
                    onClick={() => navigate(ROUTES.USER_MANAGEMENT)}
                    className="p-2 hover:bg-gray-100 transition-colors"
                    style={{ color: '#000000' }}
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 style={{ fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {isEditing ? 'Edit User' : 'Create User'}
                </h1>
            </header>

            <div className="max-w-2xl mx-auto p-6">
                {/* Errors */}
                {errors.length > 0 && (
                    <div className="mb-6 p-4" style={{ backgroundColor: '#FEF2F2', border: '1px solid #EF4444' }}>
                        {errors.map((err, i) => (
                            <p key={i} style={{ fontSize: '12px', color: '#DC2626' }}>{err}</p>
                        ))}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Basic Info */}
                    <div className="bg-white shadow-lg mb-6" style={{ border: '1px solid #E0E0E0' }}>
                        <div className="p-4" style={{ backgroundColor: '#FAFAFA', borderBottom: '1px solid #E0E0E0' }}>
                            <h2 className="flex items-center gap-2" style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                <User className="w-4 h-4" />
                                Basic Information
                            </h2>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block mb-2" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#333' }}>
                                    Full Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 border focus:outline-none focus:border-black transition-colors"
                                    style={{ fontSize: '13px', borderColor: '#E0E0E0' }}
                                    required
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block mb-2" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#333' }}>
                                    <Mail className="w-4 h-4 inline mr-2" />
                                    Email Address *
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    disabled={isEditing}
                                    className={`w-full px-4 py-3 border transition-colors ${isEditing ? 'bg-gray-50' : 'focus:outline-none focus:border-black'}`}
                                    style={{ fontSize: '13px', borderColor: '#E0E0E0' }}
                                    required={!isEditing}
                                />
                                {isEditing && (
                                    <p style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                                        Email cannot be changed after creation
                                    </p>
                                )}
                            </div>

                            {/* Password (Create only) */}
                            {!isEditing && (
                                <>
                                    <div>
                                        <label className="block mb-2" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#333' }}>
                                            <Lock className="w-4 h-4 inline mr-2" />
                                            Password *
                                        </label>
                                        <input
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full px-4 py-3 border focus:outline-none focus:border-black transition-colors"
                                            style={{ fontSize: '13px', borderColor: '#E0E0E0' }}
                                            placeholder="Min 8 chars, 1 uppercase, 1 number, 1 special"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-2" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#333' }}>
                                            Confirm Password *
                                        </label>
                                        <input
                                            type="password"
                                            value={formData.confirmPassword}
                                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                            className="w-full px-4 py-3 border focus:outline-none focus:border-black transition-colors"
                                            style={{ fontSize: '13px', borderColor: '#E0E0E0' }}
                                            required
                                        />
                                    </div>
                                </>
                            )}

                            {/* Phone */}
                            <div>
                                <label className="block mb-2" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#333' }}>
                                    <Phone className="w-4 h-4 inline mr-2" />
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-4 py-3 border focus:outline-none focus:border-black transition-colors"
                                    style={{ fontSize: '13px', borderColor: '#E0E0E0' }}
                                />
                            </div>

                            {/* Factory */}
                            <div>
                                <label className="block mb-2" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#333' }}>
                                    <Building className="w-4 h-4 inline mr-2" />
                                    Factory
                                </label>
                                <input
                                    type="text"
                                    value={formData.factory_id}
                                    onChange={(e) => setFormData({ ...formData, factory_id: e.target.value })}
                                    className="w-full px-4 py-3 border focus:outline-none focus:border-black transition-colors"
                                    style={{ fontSize: '13px', borderColor: '#E0E0E0' }}
                                    placeholder="Factory name or ID"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Role & Permissions */}
                    <div className="bg-white shadow-lg mb-6" style={{ border: '1px solid #E0E0E0' }}>
                        <div className="p-4" style={{ backgroundColor: '#FAFAFA', borderBottom: '1px solid #E0E0E0' }}>
                            <h2 className="flex items-center gap-2" style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                <Shield className="w-4 h-4" />
                                Role & Permissions
                            </h2>
                        </div>
                        <div className="p-6">
                            {/* Role Selection */}
                            <div className="mb-6">
                                <label className="block mb-2" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#333' }}>
                                    Role *
                                </label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                                    className="w-full px-4 py-3 border focus:outline-none focus:border-black"
                                    style={{ fontSize: '13px', borderColor: '#E0E0E0' }}
                                >
                                    {ASSIGNABLE_ROLES.map(role => (
                                        <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Custom Access Toggle */}
                            <div className="mb-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={useCustomAccess}
                                        onChange={(e) => setUseCustomAccess(e.target.checked)}
                                        className="w-4 h-4"
                                    />
                                    <span style={{ fontSize: '13px', color: '#333' }}>
                                        Customize section access (override role defaults)
                                    </span>
                                </label>
                            </div>

                            {/* Section Access Checkboxes */}
                            <div
                                className="p-4 rounded"
                                style={{
                                    backgroundColor: useCustomAccess ? '#FAFAFA' : '#F3F4F6',
                                    opacity: useCustomAccess ? 1 : 0.6
                                }}
                            >
                                <h3 className="mb-3" style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666' }}>
                                    Section Access
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {configurableSections.map(section => (
                                        <label key={section} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={sectionAccess[section] !== 'none'}
                                                onChange={(e) => {
                                                    if (!useCustomAccess) return;
                                                    setSectionAccess(prev => ({
                                                        ...prev,
                                                        [section]: e.target.checked ? 'full' : 'none'
                                                    }));
                                                }}
                                                disabled={!useCustomAccess}
                                                className="w-4 h-4"
                                            />
                                            <span style={{ fontSize: '12px', color: '#333' }}>
                                                {SECTION_LABELS[section]}
                                            </span>
                                            {sectionAccess[section] === 'view' && (
                                                <span style={{ fontSize: '10px', color: '#F59E0B' }}>(View Only)</span>
                                            )}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => navigate(ROUTES.USER_MANAGEMENT)}
                            className="flex-1 py-3 border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                            style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}
                            disabled={isSaving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-3 bg-black text-white hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                            style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}
                            disabled={isSaving}
                        >
                            <Save className="w-4 h-4" />
                            {isSaving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create User')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserFormPage;
