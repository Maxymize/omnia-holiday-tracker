import { useCallback } from 'react'
import posthog from 'posthog-js'
import { EventName, EventProperties } from './analytics-events'
import { PrivacyUtils } from './privacy-utils'

export const useAnalytics = () => {
  const track = useCallback(<T extends EventName>(
    eventName: T,
    properties?: EventProperties<T>
  ) => {
    // Only track if analytics is enabled and PostHog is initialized
    if (!PrivacyUtils.isAnalyticsEnabled() || !posthog.__loaded) {
      return
    }

    try {
      // Sanitize properties to remove sensitive data
      const sanitizedProperties = properties
        ? PrivacyUtils.sanitizeEventProperties(properties)
        : {}

      // Add common metadata
      const enrichedProperties = {
        ...sanitizedProperties,
        timestamp: new Date().toISOString(),
        page: typeof window !== 'undefined' ? window.location.pathname : undefined
      }

      posthog.capture(eventName, enrichedProperties)
    } catch (error) {
      console.warn('Analytics tracking failed:', error)
    }
  }, [])

  const identify = useCallback((user: any) => {
    if (!PrivacyUtils.isAnalyticsEnabled() || !posthog.__loaded) {
      return
    }

    try {
      const anonymousId = PrivacyUtils.createAnonymousUserId(user.email, user.id)
      const userProperties = PrivacyUtils.sanitizeUserProperties(user)

      posthog.identify(anonymousId, userProperties)
    } catch (error) {
      console.warn('Analytics identification failed:', error)
    }
  }, [])

  const pageview = useCallback((page?: string) => {
    if (!PrivacyUtils.isAnalyticsEnabled() || !posthog.__loaded) {
      return
    }

    try {
      posthog.capture('$pageview', {
        $current_url: typeof window !== 'undefined' ? window.location.href : page
      })
    } catch (error) {
      console.warn('Analytics pageview failed:', error)
    }
  }, [])

  return {
    track,
    identify,
    pageview,
    isEnabled: PrivacyUtils.isAnalyticsEnabled()
  }
}

// Convenience hooks for specific tracking scenarios
export const useHolidayTracking = () => {
  const { track } = useAnalytics()

  const trackHolidayRequestStarted = useCallback((type: 'vacation' | 'sick' | 'personal', step: number) => {
    track('holiday_request_started', { type, step })
  }, [track])

  const trackHolidayRequestCompleted = useCallback((type: string, days: number, autoApproved: boolean) => {
    track('holiday_request_completed', { type, days, auto_approved: autoApproved })
  }, [track])

  const trackCalendarViewed = useCallback((viewType: 'month' | 'list', filter: string) => {
    track('calendar_viewed', { view_type: viewType, filter_applied: filter })
  }, [track])

  return {
    trackHolidayRequestStarted,
    trackHolidayRequestCompleted,
    trackCalendarViewed
  }
}

export const useAdminTracking = () => {
  const { track } = useAnalytics()

  const trackAdminAction = useCallback((action: 'approve' | 'reject' | 'delete', requestType: string) => {
    track('admin_action_performed', { action, request_type: requestType })
  }, [track])

  const trackSettingsChange = useCallback((settingType: string, newValue: string | boolean) => {
    track('settings_changed', { setting_type: settingType, new_value: newValue })
  }, [track])

  return {
    trackAdminAction,
    trackSettingsChange
  }
}