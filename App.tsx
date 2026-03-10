/**
 * Main App component - Now uses router and context providers
 */
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, ProjectProvider } from './src/context';
import { AppRouter } from './src/router';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProjectProvider>
          <div className="min-h-screen">
            <AppRouter />
          </div>
        </ProjectProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
