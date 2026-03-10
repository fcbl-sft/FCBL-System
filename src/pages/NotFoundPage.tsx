/**
 * 404 Not Found Page
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import ROUTES from '../router/routes';

const NotFoundPage: React.FC = () => {
    useDocumentTitle('Page Not Found');

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
            <div className="text-center max-w-md">
                <div className="text-8xl font-bold text-gray-500 mb-4">404</div>
                <h1 className="text-3xl font-bold text-white mb-4">Page Not Found</h1>
                <p className="text-gray-400 mb-8">
                    The page you're looking for doesn't exist or has been moved.
                </p>
                <div className="flex gap-4 justify-center">
                    <Link
                        to={ROUTES.DASHBOARD}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        <Home size={20} />
                        Go to Dashboard
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} />
                        Go Back
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotFoundPage;
