/**
 * App Router - Main routing configuration
 * Uses nested routes with StyleLayout for persistent header/tabs
 */
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import ROUTES from './routes';
import {
    LoginPage,
    DashboardPage,
    StyleLayout,
    NewStylePage,
    NotFoundPage,
} from '../pages';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';

// Profile, Settings, and Admin pages
import ProfilePage from '../pages/ProfilePage';
import SettingsPage from '../pages/SettingsPage';
import AdminPanelPage from '../pages/AdminPanelPage';
import UserManagementPage from '../pages/UserManagementPage';
import UserFormPage from '../pages/UserFormPage';
import RoleManagementPage from '../pages/RoleManagementPage';
import ActivityLogsPage from '../pages/ActivityLogsPage';

// Content components for nested routes (these render inside StyleLayout's Outlet)
import SummaryContent from '../pages/SummaryContent';
import TechPackContent from '../pages/TechPackContent';
import OrderSheetContent from '../pages/OrderSheetContent';
import ConsumptionContent from '../pages/ConsumptionContent';
import PPMeetingContent from '../pages/PPMeetingContent';
import MaterialsContent from '../pages/MaterialsContent';
import InvoiceContent from '../pages/InvoiceContent';
import PackingContent from '../pages/PackingContent';
import InlinePhaseContent from '../pages/InlinePhaseContent';

const AppRouter: React.FC = () => {
    return (
        <Routes>
            {/* Public routes */}
            <Route path={ROUTES.LOGIN} element={<LoginPage />} />
            <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
            <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />

            {/* Root redirect */}
            <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />

            {/* Protected routes */}
            <Route path={ROUTES.DASHBOARD} element={
                <ProtectedRoute><DashboardPage /></ProtectedRoute>
            } />

            {/* Profile & Settings */}
            <Route path={ROUTES.PROFILE} element={
                <ProtectedRoute><ProfilePage /></ProtectedRoute>
            } />
            <Route path={ROUTES.SETTINGS} element={
                <ProtectedRoute><SettingsPage /></ProtectedRoute>
            } />

            {/* Admin Panel */}
            <Route path={ROUTES.ADMIN} element={
                <ProtectedRoute requiredSection="user_management" requiredAccess="view">
                    <AdminPanelPage />
                </ProtectedRoute>
            } />

            {/* User Management (Admin/Super Admin only) */}
            <Route path={ROUTES.ADMIN_USERS} element={
                <ProtectedRoute requiredSection="user_management" requiredAccess="view">
                    <UserManagementPage />
                </ProtectedRoute>
            } />
            <Route path={ROUTES.ADMIN_USER_NEW} element={
                <ProtectedRoute requiredSection="user_management" requiredAccess="full">
                    <UserFormPage />
                </ProtectedRoute>
            } />
            <Route path="/admin/users/:id/edit" element={
                <ProtectedRoute requiredSection="user_management" requiredAccess="full">
                    <UserFormPage />
                </ProtectedRoute>
            } />

            {/* Role Management (Super Admin only) */}
            <Route path={ROUTES.ADMIN_ROLES} element={
                <ProtectedRoute requiredSection="role_management" requiredAccess="full">
                    <RoleManagementPage />
                </ProtectedRoute>
            } />

            {/* Activity Logs */}
            <Route path={ROUTES.ADMIN_LOGS} element={
                <ProtectedRoute requiredSection="user_management" requiredAccess="view">
                    <ActivityLogsPage />
                </ProtectedRoute>
            } />

            <Route path="/styles" element={<Navigate to={ROUTES.DASHBOARD} replace />} />

            {/* New Style page - MUST come before /styles/:id */}
            <Route path={ROUTES.NEW_STYLE} element={
                <ProtectedRoute><NewStylePage /></ProtectedRoute>
            } />

            {/* Style Detail with nested routes - uses shared StyleLayout */}
            <Route path="/styles/:id" element={
                <ProtectedRoute><StyleLayout /></ProtectedRoute>
            }>
                {/* Default tab = Summary */}
                <Route index element={<SummaryContent />} />
                <Route path="tech-pack" element={<TechPackContent />} />
                <Route path="order-sheet" element={<OrderSheetContent />} />
                <Route path="consumption" element={<ConsumptionContent />} />
                <Route path="pp-meeting" element={<PPMeetingContent />} />
                <Route path="materials" element={<MaterialsContent />} />
                <Route path="inline-phase" element={<InlinePhaseContent />} />
                <Route path="documents/invoice" element={<InvoiceContent />} />
                <Route path="documents/packing" element={<PackingContent />} />
            </Route>

            {/* 404 fallback */}
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
};

export default AppRouter;


