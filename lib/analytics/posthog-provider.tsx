'use client'

import { createContext, useContext, useEffect, ReactNode } from 'react'
import { initializePostHog, getPostHogConfig } from './posthog-config'
import { PrivacyUtils } from './privacy-utils'

interface PostHogContextValue {
  isEnabled: boolean
}

const PostHogContext = createContext<PostHogContextValue>({
  isEnabled: false
})

export const usePostHogContext = () => useContext(PostHogContext)

interface PostHogProviderProps {
  children: ReactNode
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const config = getPostHogConfig()
  const isEnabled = PrivacyUtils.isAnalyticsEnabled()

  useEffect(() => {
    // Only initialize in production/staging with proper config
    if (isEnabled && config.apiKey && typeof window !== 'undefined') {
      const posthog = initializePostHog()

      if (posthog) {
        // Wait a bit for the script to load, then track initial page
        setTimeout(() => {
          posthog.capture('$pageview')
        }, 1000)
      }
    }
  }, [isEnabled, config.apiKey])

  return (
    <PostHogContext.Provider value={{ isEnabled }}>
      {children}
    </PostHogContext.Provider>
  )
}