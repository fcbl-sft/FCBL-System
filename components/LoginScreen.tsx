import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { validateEmail } from '../src/services/authService';

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<boolean>;
  onForgotPassword?: () => void;
  error?: string | null;
  isLoading?: boolean;
}

const LoginScreen: React.FC<LoginScreenProps> = ({
  onLogin,
  onForgotPassword,
  error,
  isLoading = false
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // Validation
    if (!email.trim()) {
      setLocalError('Please enter your email address');
      return;
    }
    if (!validateEmail(email)) {
      setLocalError('Please enter a valid email address');
      return;
    }
    if (!password) {
      setLocalError('Please enter your password');
      return;
    }
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      await onLogin(email, password);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = error || localError;
  const loading = isLoading || isSubmitting;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Accent Line */}
      <div style={{ height: '4px', background: 'linear-gradient(90deg, #4CAF50, #388E3C)', width: '100%' }} />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <img
              src="/fcbl-logo.svg"
              alt="FCBL"
              style={{ height: '72px', margin: '0 auto 16px' }}
            />
            <h1
              className="text-black mb-2"
              style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '1px' }}
            >
              Factory Portal
            </h1>
            <p style={{ fontSize: '12px', color: '#666666' }}>
              Fashion Comfort (BD) Ltd
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white shadow-lg" style={{ border: '1px solid #E0E0E0' }}>
            <div className="p-8">
              <h2
                className="text-center mb-6"
                style={{ fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#333' }}
              >
                Sign In to Your Account
              </h2>

              {/* Error Message */}
              {displayError && (
                <div
                  className="flex items-center gap-2 p-3 mb-4 rounded"
                  style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}
                >
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span style={{ fontSize: '12px', color: '#DC2626' }}>{displayError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Email Field */}
                <div className="mb-4">
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
                      disabled={loading}
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="mb-4">
                  <label
                    htmlFor="password"
                    style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#333' }}
                    className="block mb-2"
                  >
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-12 py-3 border focus:outline-none focus:border-green-600 transition-colors"
                      style={{ fontSize: '13px', borderColor: '#E0E0E0' }}
                      disabled={loading}
                      autoComplete="current-password"
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

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between mb-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 border-gray-300 rounded"
                      disabled={loading}
                    />
                    <span style={{ fontSize: '12px', color: '#666' }}>Remember me</span>
                  </label>
                  {onForgotPassword && (
                    <button
                      type="button"
                      onClick={onForgotPassword}
                      className="text-black hover:underline"
                      style={{ fontSize: '12px', fontWeight: 500 }}
                      disabled={loading}
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 text-white font-semibold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ fontSize: '12px', letterSpacing: '1px', background: 'linear-gradient(90deg, #4CAF50, #388E3C)' }}
                  onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'linear-gradient(90deg, #388E3C, #2E7D32)'; }}
                  onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = 'linear-gradient(90deg, #4CAF50, #388E3C)'; }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>
            </div>

            {/* Footer */}
            <div
              className="p-4 text-center"
              style={{
                backgroundColor: '#FAFAFA',
                fontSize: '10px',
                color: '#888888',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderTop: '1px solid #E0E0E0'
              }}
            >
              Secure Login • Factory Portal v2.0
            </div>
          </div>
        </div>
      </div>
    </div>

  );
};

export default LoginScreen;