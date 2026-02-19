/**
 * Permission Constants - Role-based section access matrix
 * Defines default access levels for each role to each section
 */
import { UserRole, SectionId, SectionAccessLevel, SectionAccessMap } from '../../types';

// All system sections
export const ALL_SECTIONS: SectionId[] = [
    'dashboard',
    'summary',
    'tech_pack',
    'order_sheet',
    'consumption',
    'pp_meeting',
    'mq_control',
    'commercial',
    'qc_inspect',
    'user_management',
    'role_management',
];

// Section labels for UI
export const SECTION_LABELS: Record<SectionId, string> = {
    dashboard: 'Dashboard',
    summary: 'Summary',
    tech_pack: 'Tech Pack',
    order_sheet: 'Order Sheet',
    consumption: 'Consumption',
    pp_meeting: 'PP Meeting',
    mq_control: 'MQ Control',
    commercial: 'Commercial',
    qc_inspect: 'QC Inspect',
    user_management: 'User Management',
    role_management: 'Role Management',
};

// Helper to create a full access map with default 'none'
const createAccessMap = (overrides: Partial<Record<SectionId, SectionAccessLevel>>): SectionAccessMap => {
    const base: SectionAccessMap = {
        dashboard: 'none',
        summary: 'none',
        tech_pack: 'none',
        order_sheet: 'none',
        consumption: 'none',
        pp_meeting: 'none',
        mq_control: 'none',
        commercial: 'none',
        qc_inspect: 'none',
        user_management: 'none',
        role_management: 'none',
    };
    return { ...base, ...overrides };
};

/**
 * Default section access for each role
 * ✅ = 'full' (Full Access)
 * 👁️ = 'view' (View Only)
 * ❌ = 'none' (No Access)
 */
export const DEFAULT_ROLE_ACCESS: Record<UserRole, SectionAccessMap> = {
    // Super Admin: Full access to everything
    super_admin: createAccessMap({
        dashboard: 'full',
        summary: 'full',
        tech_pack: 'full',
        order_sheet: 'full',
        consumption: 'full',
        pp_meeting: 'full',
        mq_control: 'full',
        commercial: 'full',
        qc_inspect: 'full',
        user_management: 'full',
        role_management: 'full',
    }),

    // Admin: Full access except Role Management
    admin: createAccessMap({
        dashboard: 'full',
        summary: 'full',
        tech_pack: 'full',
        order_sheet: 'full',
        consumption: 'full',
        pp_meeting: 'full',
        mq_control: 'full',
        commercial: 'full',
        qc_inspect: 'full',
        user_management: 'full',
        role_management: 'none',
    }),

    // Director: View all, limited edit
    director: createAccessMap({
        dashboard: 'full',
        summary: 'full',
        tech_pack: 'full',
        order_sheet: 'full',
        consumption: 'full',
        pp_meeting: 'full',
        mq_control: 'full',
        commercial: 'full',
        qc_inspect: 'full',
        user_management: 'none',
        role_management: 'none',
    }),

    // Merchandiser: Specific sections only
    merchandiser: createAccessMap({
        dashboard: 'full',
        summary: 'full',
        tech_pack: 'full',
        order_sheet: 'full',
        consumption: 'full',
        pp_meeting: 'full',
        mq_control: 'none',
        commercial: 'full',
        qc_inspect: 'none',
        user_management: 'none',
        role_management: 'none',
    }),

    // QC: QC-related sections only
    qc: createAccessMap({
        dashboard: 'full',
        summary: 'full',
        tech_pack: 'none',
        order_sheet: 'none',
        consumption: 'none',
        pp_meeting: 'full',
        mq_control: 'full',
        commercial: 'none',
        qc_inspect: 'full',
        user_management: 'none',
        role_management: 'none',
    }),

    // Viewer: Read-only access to all content sections
    viewer: createAccessMap({
        dashboard: 'full',
        summary: 'full',
        tech_pack: 'view',
        order_sheet: 'view',
        consumption: 'view',
        pp_meeting: 'view',
        mq_control: 'view',
        commercial: 'view',
        qc_inspect: 'view',
        user_management: 'none',
        role_management: 'none',
    }),
};

// Role labels for UI
export const ROLE_LABELS: Record<UserRole, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    director: 'Director',
    merchandiser: 'Merchandiser',
    qc: 'QC',
    viewer: 'Viewer',
};

// Role descriptions
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
    super_admin: 'Full access, manage all users & roles',
    admin: 'Manage users, access all features',
    director: 'View all, limited edit',
    merchandiser: 'Manage styles, orders, consumption',
    qc: 'QC Inspect, PP Meeting, MQ Control only',
    viewer: 'Read-only access',
};

// All available roles
export const ALL_ROLES: UserRole[] = ['super_admin', 'admin', 'director', 'merchandiser', 'qc', 'viewer'];

// Roles that can be assigned by Admin (excludes super_admin)
export const ASSIGNABLE_ROLES: UserRole[] = ['admin', 'director', 'merchandiser', 'qc', 'viewer'];

/**
 * Check if a role can access a section at a specific level
 */
export function hasAccess(
    userAccess: SectionAccessMap | undefined,
    section: SectionId,
    requiredLevel: SectionAccessLevel = 'view'
): boolean {
    if (!userAccess) return false;

    const accessLevel = userAccess[section];

    if (accessLevel === 'full') return true;
    if (accessLevel === 'view' && requiredLevel === 'view') return true;

    return false;
}

/**
 * Check if user has view-only access (not full)
 */
export function isViewOnly(userAccess: SectionAccessMap | undefined, section: SectionId): boolean {
    if (!userAccess) return true;
    return userAccess[section] === 'view';
}

/**
 * Check if user can manage users (super_admin or admin)
 */
export function canManageUsers(role: UserRole): boolean {
    return role === 'super_admin' || role === 'admin';
}

/**
 * Check if user can manage roles (super_admin only)
 */
export function canManageRoles(role: UserRole): boolean {
    return role === 'super_admin';
}

/**
 * Get effective section access for a user
 * Uses custom access if set, otherwise falls back to role defaults
 */
export function getEffectiveAccess(
    role: UserRole,
    customAccess?: Partial<SectionAccessMap>
): SectionAccessMap {
    const defaultAccess = DEFAULT_ROLE_ACCESS[role];
    if (!customAccess) return defaultAccess;
    return { ...defaultAccess, ...customAccess };
}
