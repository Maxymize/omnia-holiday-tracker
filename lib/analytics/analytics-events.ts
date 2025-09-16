// Event definitions for PostHog tracking
export interface HolidayEvents {
  'holiday_request_started': {
    type: 'vacation' | 'sick' | 'personal'
    step: number
  }
  'holiday_request_completed': {
    type: string
    days: number
    auto_approved: boolean
  }
  'admin_action_performed': {
    action: 'approve' | 'reject' | 'delete'
    request_type: string
  }
  'calendar_viewed': {
    view_type: 'month' | 'list'
    filter_applied: string
  }
  'document_uploaded': {
    file_type: string
    file_size_kb: number
    request_type: 'sick' | 'personal'
  }
  'language_switched': {
    from: 'it' | 'en' | 'es'
    to: 'it' | 'en' | 'es'
    page: string
  }
  'page_viewed': {
    page: string
    user_role: 'employee' | 'admin'
  }
  'login_completed': {
    method: 'email'
    user_role: 'employee' | 'admin'
  }
  'user_login': {
    role: 'employee' | 'admin'
    department: string
    language: 'it' | 'en' | 'es'
  }
  'user_logout': {
    role: 'employee' | 'admin'
    session_duration: number
  }
  'settings_changed': {
    setting_type: string
    new_value: string | boolean
  }
}

export type EventName = keyof HolidayEvents
export type EventProperties<T extends EventName> = HolidayEvents[T]