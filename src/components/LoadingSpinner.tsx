/**
 * Loading Spinner Component
 */
import React from 'react';

interface LoadingSpinnerProps {
    message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading...' }) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
                <p className="text-gray-400 text-lg">{message}</p>
                <p className="text-gray-500 text-sm mt-2">Please wait while we load the page content.</p>
            </div>
        </div>
    );
};

export default LoadingSpinner;
