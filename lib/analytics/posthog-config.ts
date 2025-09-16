import posthog from 'posthog-js'

export interface PostHogConfig {
  apiKey: string
  apiHost: string
  enabled: boolean
}

export const getPostHogConfig = (): PostHogConfig => {
  return {
    apiKey: process.env.NEXT_PUBLIC_POSTHOG_KEY || '',
    apiHost: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.posthog.com',
    enabled: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true' && typeof window !== 'undefined'
  }
}

export const initializePostHog = () => {
  const config = getPostHogConfig()

  if (!config.enabled || !config.apiKey) {
    console.log('📊 PostHog analytics disabled or not configured')
    return null
  }

  // Only initialize in browser environment
  if (typeof window === 'undefined') {
    return null
  }

  try {
    posthog.init(config.apiKey, {
      api_host: config.apiHost,
      // GDPR & EU Compliance Settings
      person_profiles: 'identified_only',
      capture_pageview: false, // Manual pageview tracking
      capture_pageleave: true,
      persistence: 'localStorage+cookie',

      // Privacy Settings
      session_recording: {
        maskAllInputs: true,
        maskInputOptions: {
          password: true,
          email: true
        }
      },

      // Performance & Privacy
      respect_dnt: true,
      opt_out_capturing_by_default: false,
      loaded: () => {
        console.log('📊 PostHog initialized successfully')
      }
    })

    return posthog
  } catch (error) {
    console.error('📊 PostHog initialization failed:', error)
    return null
  }
}