/**
 * Reset Password Page - Set new password after reset link
 */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft, CheckCircle, AlertCircle, Loader2, Eye, EyeOff, Check, X } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import ROUTES from '../router/routes';
import { validatePassword, updatePassword, PASSWORD_REQUIREMENTS } from '../services/authService';
import { supabase } from '../../lib/supabase';

const ResetPasswordPage: React.FC = () => {
    useDocumentTitle('Reset Password');
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSession, setHasSession] = useState<boolean | null>(null);

    // Check if user has a valid reset session
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setHasSession(!!session);
        };
        checkSession();
    }, []);

    // Password strength check
    const passwordChecks = {
        length: password.length >= PASSWORD_REQUIREMENTS.minLength,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const allChecksPassed = Object.values(passwordChecks).every(Boolean);
    const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        const validation = validatePassword(password);
        if (!validation.valid) {
            setError(validation.errors[0]);
            return;
        }
        if (!passwordsMatch) {
            setError('Passwords do not match');
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await updatePassword(password);
            if (result.error) {
                setError(result.error);
            } else {
                setIsSuccess(true);
                // Redirect to login after 3 seconds
                setTimeout(() => navigate(ROUTES.LOGIN), 3000);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Check if session is being verified
    if (hasSession === null) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    // Show error if no valid session
    if (!hasSession && !isSuccess) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-md bg-white shadow-lg p-8" style={{ border: '1px solid #E0E0E0' }}>
                    <div className="text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-8 h-8 text-red-600" />
                        </div>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#000', marginBottom: '8px' }}>
                            Invalid or Expired Link
                        </h2>
                        <p style={{ fontSize: '13px', color: '#666', marginBottom: '24px' }}>
                            This password reset link is invalid or has expired. Please request a new one.
                        </p>
                        <Link
                            to={ROUTES.FORGOT_PASSWORD}
                            className="inline-block px-6 py-3 text-white font-semibold uppercase tracking-wider transition-all"
                            style={{ fontSize: '12px', background: 'linear-gradient(90deg, #4CAF50, #388E3C)' }}
                        >
                            Request New Link
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const CheckItem = ({ passed, label }: { passed: boolean; label: string }) => (
        <div className="flex items-center gap-2">
            {passed ? (
                <Check className="w-3 h-3 text-green-600" />
            ) : (
                <X className="w-3 h-3 text-gray-400" />
            )}
            <span style={{ fontSize: '11px', color: passed ? '#059669' : '#9CA3AF' }}>{label}</span>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <img
                        src="/fcbl-logo.svg"
                        alt="FCBL"
                        style={{ height: '72px', margin: '0 auto 16px' }}
                    />
                </div>

                {/* Card */}
                <div className="bg-white shadow-lg" style={{ border: '1px solid #E0E0E0' }}>
                    <div className="p-8">
                        {!isSuccess ? (
                            <>
                                <h2
                                    className="text-center mb-2"
                                    style={{ fontSize: '18px', fontWeight: 700, color: '#000' }}
                                >
                                    Create New Password
                                </h2>
                                <p
                                    className="text-center mb-6"
                                    style={{ fontSize: '13px', color: '#666' }}
                                >
                                    Enter a strong password for your account.
                                </p>

                                {/* Error Message */}
                                {error && (
                                    <div
                                        className="flex items-center gap-2 p-3 mb-4 rounded"
                                        style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}
                                    >
                                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                        <span style={{ fontSize: '12px', color: '#DC2626' }}>{error}</span>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit}>
                                    {/* New Password */}
                                    <div className="mb-4">
                                        <label
                                            htmlFor="password"
                                            style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#333' }}
                                            className="block mb-2"
                                        >
                                            New Password *
                                        </label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                id="password"
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Enter new password"
                                                className="w-full pl-10 pr-12 py-3 border focus:outline-none focus:border-green-600 transition-colors"
                                                style={{ fontSize: '13px', borderColor: '#E0E0E0' }}
                                                disabled={isSubmitting}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                tabIndex={-1}
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Password Requirements */}
                                    {password.length > 0 && (
                                        <div className="mb-4 p-3 bg-gray-50 rounded" style={{ border: '1px solid #E0E0E0' }}>
                                            <div className="grid grid-cols-2 gap-1">
                                                <CheckItem passed={passwordChecks.length} label="8+ characters" />
                                                <CheckItem passed={passwordChecks.uppercase} label="Uppercase letter" />
                                                <CheckItem passed={passwordChecks.lowercase} label="Lowercase letter" />
                                                <CheckItem passed={passwordChecks.number} label="Number" />
                                                <CheckItem passed={passwordChecks.special} label="Special character" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Confirm Password */}
                                    <div className="mb-6">
                                        <label
                                            htmlFor="confirmPassword"
                                            style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#333' }}
                                            className="block mb-2"
                                        >
                                            Confirm Password *
                                        </label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                id="confirmPassword"
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="Confirm new password"
                                                className="w-full pl-10 pr-12 py-3 border focus:outline-none focus:border-green-600 transition-colors"
                                                style={{
                                                    fontSize: '13px',
                                                    borderColor: confirmPassword.length > 0
                                                        ? (passwordsMatch ? '#059669' : '#DC2626')
                                                        : '#E0E0E0'
                                                }}
                                                disabled={isSubmitting}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                tabIndex={-1}
                                            >
                                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        {confirmPassword.length > 0 && !passwordsMatch && (
                                            <p style={{ fontSize: '11px', color: '#DC2626', marginTop: '4px' }}>
                                                Passwords do not match
                                            </p>
                                        )}
                                    </div>

                                    {/* Submit Button */}
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !allChecksPassed || !passwordsMatch}
                                        className="w-full py-3 text-white font-semibold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        style={{ fontSize: '12px', letterSpacing: '1px', background: 'linear-gradient(90deg, #4CAF50, #388E3C)' }}
                                        onMouseEnter={(e) => { if (!isSubmitting) e.currentTarget.style.background = 'linear-gradient(90deg, #388E3C, #2E7D32)'; }}
                                        onMouseLeave={(e) => { if (!isSubmitting) e.currentTarget.style.background = 'linear-gradient(90deg, #4CAF50, #388E3C)'; }}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Updating...
                                            </>
                                        ) : (
                                            'Update Password'
                                        )}
                                    </button>
                                </form>
                            </>
                        ) : (
                            /* Success State */
                            <div className="text-center py-4">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="w-8 h-8 text-green-600" />
                                </div>
                                <h2
                                    className="mb-2"
                                    style={{ fontSize: '18px', fontWeight: 700, color: '#000' }}
                                >
                                    Password Updated
                                </h2>
                                <p
                                    className="mb-4"
                                    style={{ fontSize: '13px', color: '#666' }}
                                >
                                    Your password has been successfully updated. You will be redirected to login shortly.
                                </p>
                                <Link
                                    to={ROUTES.LOGIN}
                                    className="inline-block px-6 py-3 text-white font-semibold uppercase tracking-wider transition-all"
                                    style={{ fontSize: '12px', background: 'linear-gradient(90deg, #4CAF50, #388E3C)' }}
                                >
                                    Go to Login
                                </Link>
                            </div>
                        )}

                        {/* Back to Login (only if not success) */}
                        {!isSuccess && (
                            <div className="mt-6 text-center">
                                <Link
                                    to={ROUTES.LOGIN}
                                    className="inline-flex items-center gap-2 text-black hover:underline"
                                    style={{ fontSize: '12px', fontWeight: 500 }}
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Login
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
