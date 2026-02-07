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

            {/* Root redirect */}
            <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />

            {/* Protected routes */}
            <Route path={ROUTES.DASHBOARD} element={
                <ProtectedRoute><DashboardPage /></ProtectedRoute>
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
