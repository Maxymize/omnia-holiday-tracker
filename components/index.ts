// UI Components
export * from "./ui"

// Layout Components
export { DashboardHeader } from "./layout/dashboard-header" 
export { DashboardSidebar } from "./layout/dashboard-sidebar"

// Form Components
export { HolidayRequestForm } from "./forms/holiday-request-form"

// Calendar Components
export { HolidayCalendar, CalendarLegend } from "./calendar/holiday-calendar"
export { IntegratedCalendar } from "./calendar/integrated-calendar"
export { MobileCalendar } from "./calendar/mobile-calendar"
export { ResponsiveCalendar } from "./calendar/responsive-calendar"
export { HolidayEventDetails, CompactHolidayEventDetails } from "./calendar/holiday-event-details"

// Dashboard Components
export { StatsCards, getEmployeeStats, getAdminStats } from "./dashboard/stats-cards"

// Loading Components
export {
  CalendarSkeleton,
  HolidayCardSkeleton,
  EmployeeListSkeleton,
  DashboardStatsSkeleton,
  FormSkeleton,
  DataTableSkeleton
} from "./loading/skeleton-components"

// i18n Components
export { LanguageSwitcher } from "./i18n/language-switcher"