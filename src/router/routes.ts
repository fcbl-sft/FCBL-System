/**
 * Route constants
 */
const ROUTES = {
    // Auth
    LOGIN: '/login',
    FORGOT_PASSWORD: '/forgot-password',
    RESET_PASSWORD: '/reset-password',

    // Main
    DASHBOARD: '/dashboard',
    NEW_STYLE: '/styles/new',

    // Profile & Settings
    PROFILE: '/profile',
    SETTINGS: '/settings',

    // Admin Panel
    ADMIN: '/admin',
    ADMIN_USERS: '/admin/users',
    ADMIN_USER_NEW: '/admin/users/new',
    ADMIN_ROLES: '/admin/roles',
    ADMIN_LOGS: '/admin/logs',

    // Legacy routes (for backward compatibility)
    USER_MANAGEMENT: '/admin/users',
    USER_NEW: '/admin/users/new',
    ROLE_MANAGEMENT: '/admin/roles',

    // Style routes
    STYLE_DETAIL: (id: string) => `/styles/${id}`,
    TECH_PACK: (id: string) => `/styles/${id}/tech-pack`,
    ORDER_SHEET: (id: string) => `/styles/${id}/order-sheet`,
    CONSUMPTION: (id: string) => `/styles/${id}/consumption`,
    PP_MEETING: (id: string) => `/styles/${id}/pp-meeting`,
    MATERIALS: (id: string) => `/styles/${id}/materials`,
    INLINE_PHASE: (id: string) => `/styles/${id}/inline-phase`,
    INVOICE: (id: string) => `/styles/${id}/documents/invoice`,
    PACKING: (id: string) => `/styles/${id}/documents/packing`,
    ROLE_EDIT: (id: string) => `/roles/${id}/edit`,

    NOT_FOUND: '/404',
} as const;

export default ROUTES;

