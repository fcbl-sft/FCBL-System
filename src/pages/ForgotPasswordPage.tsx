/**
 * Forgot Password Page - Email-based password reset
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import ROUTES from '../router/routes';
import { validateEmail } from '../services/authService';

const ForgotPasswordPage: React.FC = () => {
    useDocumentTitle('Forgot Password');
    const { resetPassword } = useAuth();

    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email.trim()) {
            setError('Please enter your email address');
            return;
        }
        if (!validateEmail(email)) {
            setError('Please enter a valid email address');
            return;
        }

        setIsSubmitting(true);
        try {
            await resetPassword(email);
            setIsSubmitted(true);
        } catch (err) {
            // For security, always show success even on error
            setIsSubmitted(true);
        } finally {
            setIsSubmitting(false);
        }
    };

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
                        {!isSubmitted ? (
                            <>
                                <h2
                                    className="text-center mb-2"
                                    style={{ fontSize: '18px', fontWeight: 700, color: '#000' }}
                                >
                                    Reset Password
                                </h2>
                                <p
                                    className="text-center mb-6"
                                    style={{ fontSize: '13px', color: '#666' }}
                                >
                                    Enter your email address and we'll send you a link to reset your password.
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
                                    {/* Email Field */}
                                    <div className="mb-6">
                                        <label
                                            htmlFor="email"
                                            style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#333' }}
                                            className="block mb-2"
                                        >
                                            Email Address *
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                id="email"
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="your@email.com"
                                                className="w-full pl-10 pr-4 py-3 border focus:outline-none focus:border-green-600 transition-colors"
                                                style={{ fontSize: '13px', borderColor: '#E0E0E0' }}
                                                disabled={isSubmitting}
                                                autoComplete="email"
                                            />
                                        </div>
                                    </div>

                                    {/* Submit Button */}
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full py-3 text-white font-semibold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        style={{ fontSize: '12px', letterSpacing: '1px', background: 'linear-gradient(90deg, #4CAF50, #388E3C)' }}
                                        onMouseEnter={(e) => { if (!isSubmitting) e.currentTarget.style.background = 'linear-gradient(90deg, #388E3C, #2E7D32)'; }}
                                        onMouseLeave={(e) => { if (!isSubmitting) e.currentTarget.style.background = 'linear-gradient(90deg, #4CAF50, #388E3C)'; }}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            'Send Reset Link'
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
                                    Check Your Email
                                </h2>
                                <p
                                    className="mb-4"
                                    style={{ fontSize: '13px', color: '#666' }}
                                >
                                    If an account exists for <strong>{email}</strong>, you will receive a password reset link shortly.
                                </p>
                                <p
                                    style={{ fontSize: '12px', color: '#888' }}
                                >
                                    Didn't receive the email? Check your spam folder.
                                </p>
                            </div>
                        )}

                        {/* Back to Login */}
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
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
