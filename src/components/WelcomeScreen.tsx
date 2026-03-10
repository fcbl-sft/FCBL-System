/**
 * Welcome Screen - Beautiful animated welcome after login
 * Shows user name with smooth animations before redirecting to dashboard
 */
import React, { useEffect, useState } from 'react';

interface WelcomeScreenProps {
    userName: string;
    onComplete: () => void;
    /** Duration in ms before calling onComplete (default: 2500) */
    duration?: number;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
    userName,
    onComplete,
    duration = 2500,
}) => {
    const [stage, setStage] = useState(0); // 0=logo, 1=greeting, 2=name, 3=line, 4=status, 5=fadeout
    const [fadeOut, setFadeOut] = useState(false);

    // Display name: use first name, or email prefix, or "User"
    const displayName = userName
        ? userName.includes('@')
            ? userName.split('@')[0]
            : userName.split(' ')[0]
        : 'User';

    useEffect(() => {
        // Stagger animation stages
        const timers = [
            setTimeout(() => setStage(1), 300),    // Show greeting
            setTimeout(() => setStage(2), 600),    // Show name
            setTimeout(() => setStage(3), 900),    // Show line
            setTimeout(() => setStage(4), 1200),   // Show status text
            setTimeout(() => {
                setFadeOut(true);                  // Start fade out
            }, duration - 400),
            setTimeout(() => {
                onComplete();                       // Navigate to dashboard
            }, duration),
        ];

        return () => timers.forEach(clearTimeout);
    }, [duration, onComplete]);

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAF9 50%, #F0F7F4 100%)',
                opacity: fadeOut ? 0 : 1,
                transition: 'opacity 0.4s ease-in',
            }}
        >
            <div style={{ textAlign: 'center', maxWidth: '400px', padding: '20px' }}>
                {/* Logo */}
                <div
                    style={{
                        opacity: stage >= 0 ? 1 : 0,
                        transform: stage >= 0 ? 'scale(1)' : 'scale(0.8)',
                        transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
                        marginBottom: '32px',
                    }}
                >
                    <div
                        style={{
                            width: '72px',
                            height: '72px',
                            margin: '0 auto',
                            borderRadius: '16px',
                            background: 'linear-gradient(135deg, #2E7D32 0%, #4CAF50 50%, #66BB6A 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 8px 32px rgba(46, 125, 50, 0.25)',
                        }}
                    >
                        <span
                            style={{
                                color: '#FFFFFF',
                                fontSize: '22px',
                                fontWeight: 800,
                                letterSpacing: '1.5px',
                                fontFamily: 'Inter, system-ui, sans-serif',
                            }}
                        >
                            FCBL
                        </span>
                    </div>
                </div>

                {/* "Welcome back," */}
                <div
                    style={{
                        opacity: stage >= 1 ? 1 : 0,
                        transform: stage >= 1 ? 'translateY(0)' : 'translateY(12px)',
                        transition: 'opacity 0.5s ease-out 0.1s, transform 0.5s ease-out 0.1s',
                        marginBottom: '8px',
                    }}
                >
                    <span
                        style={{
                            fontSize: '15px',
                            fontWeight: 400,
                            color: '#888888',
                            letterSpacing: '0.3px',
                            fontFamily: 'Inter, system-ui, sans-serif',
                        }}
                    >
                        Welcome back,
                    </span>
                </div>

                {/* User Name */}
                <div
                    style={{
                        opacity: stage >= 2 ? 1 : 0,
                        transform: stage >= 2 ? 'translateY(0)' : 'translateY(16px)',
                        transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
                        marginBottom: '24px',
                    }}
                >
                    <h1
                        style={{
                            fontSize: '32px',
                            fontWeight: 700,
                            color: '#1A1A1A',
                            margin: 0,
                            letterSpacing: '-0.5px',
                            fontFamily: 'Inter, system-ui, sans-serif',
                        }}
                    >
                        {displayName}
                    </h1>
                </div>

                {/* Accent Line */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        marginBottom: '24px',
                    }}
                >
                    <div
                        style={{
                            width: stage >= 3 ? '80px' : '0px',
                            height: '3px',
                            background: 'linear-gradient(90deg, #4CAF50, #66BB6A)',
                            borderRadius: '2px',
                            transition: 'width 0.5s ease-out',
                        }}
                    />
                </div>

                {/* Status Text */}
                <div
                    style={{
                        opacity: stage >= 4 ? 1 : 0,
                        transition: 'opacity 0.4s ease-out',
                        marginBottom: '24px',
                    }}
                >
                    <span
                        style={{
                            fontSize: '13px',
                            fontWeight: 400,
                            color: '#AAAAAA',
                            letterSpacing: '0.2px',
                            fontFamily: 'Inter, system-ui, sans-serif',
                        }}
                    >
                        Preparing your workspace...
                    </span>
                </div>

                {/* Animated Dots */}
                <div
                    style={{
                        opacity: stage >= 4 ? 1 : 0,
                        transition: 'opacity 0.4s ease-out',
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '6px',
                    }}
                >
                    {[0, 1, 2].map(i => (
                        <div
                            key={i}
                            style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: '#4CAF50',
                                animation: `welcomeDotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Keyframe animation for dots */}
            <style>{`
                @keyframes welcomeDotPulse {
                    0%, 100% { opacity: 0.25; transform: scale(0.8); }
                    50% { opacity: 1; transform: scale(1.2); }
                }
            `}</style>
        </div>
    );
};

export default WelcomeScreen;
