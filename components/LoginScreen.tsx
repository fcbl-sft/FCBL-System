import React from 'react';
import { Factory, ArrowRight } from 'lucide-react';
import { UserRole } from '../types';

interface LoginScreenProps {
  onLogin: (role: UserRole) => void;
  videoUrl?: string;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, videoUrl }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background video support */}
      {videoUrl && (
        <video
          autoPlay
          muted
          loop
          className="absolute inset-0 w-full h-full object-cover z-0 opacity-10"
        >
          <source src={videoUrl} type="video/mp4" />
        </video>
      )}

      <div className="max-w-md w-full bg-white z-10" style={{ border: '1px solid #E0E0E0' }}>
        {/* Header */}
        <div className="p-8 text-center" style={{ borderBottom: '1px solid #E0E0E0' }}>
          <div
            className="w-16 h-16 bg-black text-white flex items-center justify-center mx-auto mb-4"
            style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '1px' }}
          >
            FCBL
          </div>
          <h1
            className="text-black mb-2"
            style={{ fontSize: '18px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}
          >
            Factory Portal
          </h1>
          <p style={{ fontSize: '11px', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Fashion Comfort (BD) Ltd
          </p>
        </div>

        {/* Login Button */}
        <div className="p-6">
          <button
            onClick={() => onLogin('supplier')}
            className="w-full group relative flex items-center p-4 transition-all text-left"
            style={{
              border: '1px solid #E0E0E0',
              backgroundColor: '#FFFFFF'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F5F5F5';
              e.currentTarget.style.borderColor = '#000000';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#E0E0E0';
            }}
          >
            <div
              className="w-12 h-12 flex items-center justify-center shrink-0 mr-4"
              style={{ backgroundColor: '#F5F5F5' }}
            >
              <Factory className="w-6 h-6" style={{ color: '#000000' }} />
            </div>
            <div className="flex-grow">
              <h3 style={{ fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#000000' }}>
                Supplier / Factory Portal
              </h3>
              <p style={{ fontSize: '11px', color: '#666666', marginTop: '4px' }}>
                Create packs, manage QC, generate reports
              </p>
            </div>
            <ArrowRight className="w-5 h-5" style={{ color: '#888888' }} />
          </button>
        </div>

        {/* Footer */}
        <div
          className="p-4 text-center"
          style={{
            backgroundColor: '#FAFAFA',
            fontSize: '10px',
            color: '#888888',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          Supplier Access Only
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;