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

// Section access guard for nested routes
import SectionGuard from '../components/SectionGuard';
import { AccessDenied } from './ProtectedRoute';

const AppRouter: React.FC = () => {
    // Fallback for denied nested route access
    const accessDeniedFallback = <AccessDenied message="You don't have permission to access this section." />;

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
                <Route index element={
                    <SectionGuard section="summary" fallback={accessDeniedFallback}><SummaryContent /></SectionGuard>
                } />
                <Route path="tech-pack" element={
                    <SectionGuard section="tech_pack" fallback={accessDeniedFallback}><TechPackContent /></SectionGuard>
                } />
                <Route path="order-sheet" element={
                    <SectionGuard section="order_sheet" fallback={accessDeniedFallback}><OrderSheetContent /></SectionGuard>
                } />
                <Route path="consumption" element={
                    <SectionGuard section="consumption" fallback={accessDeniedFallback}><ConsumptionContent /></SectionGuard>
                } />
                <Route path="pp-meeting" element={
                    <SectionGuard section="pp_meeting" fallback={accessDeniedFallback}><PPMeetingContent /></SectionGuard>
                } />
                <Route path="materials" element={
                    <SectionGuard section="mq_control" fallback={accessDeniedFallback}><MaterialsContent /></SectionGuard>
                } />
                <Route path="inline-phase" element={
                    <SectionGuard section="qc_inspect" fallback={accessDeniedFallback}><InlinePhaseContent /></SectionGuard>
                } />
                <Route path="documents/invoice" element={
                    <SectionGuard section="commercial" fallback={accessDeniedFallback}><InvoiceContent /></SectionGuard>
                } />
                <Route path="documents/packing" element={
                    <SectionGuard section="commercial" fallback={accessDeniedFallback}><PackingContent /></SectionGuard>
                } />
            </Route>

            {/* 404 fallback */}
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    );
};

export default AppRouter;


