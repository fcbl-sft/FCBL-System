/**
 * User Dropdown Menu Component
 * Shows user avatar/name with dropdown menu for Profile, Settings, Admin Panel, Logout
 */
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, Shield, LogOut, ChevronDown } from 'lucide-react';
import { UserRole } from '../../types';
import ROUTES from '../router/routes';

interface UserDropdownProps {
    userName: string;
    userRole: UserRole;
    onLogout: () => void;
}

const UserDropdown: React.FC<UserDropdownProps> = ({ userName, userRole, onLogout }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const canAccessAdmin = userRole === 'super_admin' || userRole === 'admin';

    const handleNavigate = (path: string) => {
        setIsOpen(false);
        navigate(path);
    };

    const handleLogout = () => {
        setIsOpen(false);
        onLogout();
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className="flex items-center gap-2 text-sm text-gray-700 hover:text-black transition-colors"
            >
                <div
                    className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center"
                    style={{ backgroundColor: '#E5E7EB' }}
                >
                    <User className="w-4 h-4 text-gray-600" />
                </div>
                <span className="font-medium">{userName || 'User'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className="absolute right-0 top-full mt-2 bg-white border border-gray-200 shadow-lg rounded-lg py-1 z-50"
                    style={{ minWidth: '180px' }}
                >
                    {/* User Info Header */}
                    <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">{userName || 'User'}</p>
                        <p className="text-xs text-gray-500 capitalize">{userRole.replace('_', ' ')}</p>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                        <button
                            onClick={() => handleNavigate(ROUTES.PROFILE)}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <User className="w-4 h-4" />
                            My Profile
                        </button>

                        <button
                            onClick={() => handleNavigate('/settings')}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <Settings className="w-4 h-4" />
                            Settings
                        </button>

                        {canAccessAdmin && (
                            <button
                                onClick={() => handleNavigate('/admin')}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                <Shield className="w-4 h-4" />
                                Admin Panel
                            </button>
                        )}
                    </div>

                    {/* Logout */}
                    <div className="border-t border-gray-100 py-1">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserDropdown;
