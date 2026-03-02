/**
 * Loading Spinner Component
 */
import React from 'react';

interface LoadingSpinnerProps {
    message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading...' }) => {
    return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-3 border-gray-300 border-t-black mb-4"></div>
                <p style={{ fontSize: '14px', fontWeight: 500, color: '#333333' }}>{message}</p>
                <p style={{ fontSize: '12px', color: '#999999', marginTop: '8px' }}>Please wait...</p>
            </div>
        </div>
    );
};

export default LoadingSpinner;
