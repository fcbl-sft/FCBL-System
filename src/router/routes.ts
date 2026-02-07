/**
 * Route path constants
 */
export const ROUTES = {
    LOGIN: '/login',
    DASHBOARD: '/dashboard',
    STYLES: '/styles',
    NEW_STYLE: '/styles/new',
    STYLE_VIEW: (id: string) => `/styles/${id}`,
    TECH_PACK: (id: string) => `/styles/${id}`,
    ORDER_SHEET: (id: string) => `/styles/${id}/order-sheet`,
    CONSUMPTION: (id: string) => `/styles/${id}/consumption`,
    PP_MEETING: (id: string) => `/styles/${id}/pp-meeting`,
    INLINE_PHASE: (id: string) => `/styles/${id}/inline-phase`,
    MATERIALS: (id: string) => `/styles/${id}/materials`,
    INVOICE: (id: string) => `/styles/${id}/documents/invoice`,
    PACKING: (id: string) => `/styles/${id}/documents/packing`,
    NOT_FOUND: '/404',
} as const;

export default ROUTES;
