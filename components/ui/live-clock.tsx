"use client"

import * as React from "react"
import { Clock, MapPin, Globe } from "lucide-react"
import { useTranslation } from "@/lib/i18n/provider"

interface LiveClockProps {
  className?: string
  showSeconds?: boolean
  showTimezone?: boolean
  compact?: boolean
  showFullTimezone?: boolean
  manualTimezone?: string
  showTimezoneIndicator?: boolean
}

export function LiveClock({
  className = "",
  showSeconds = true,
  showTimezone = true,
  compact = false,
  showFullTimezone = false,
  manualTimezone,
  showTimezoneIndicator = true
}: LiveClockProps) {
  const { t, locale } = useTranslation()
  const [currentTime, setCurrentTime] = React.useState(new Date())

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Format time based on locale and timezone
  const formatTime = (date: Date) => {
    const activeTimezone = manualTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone

    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      ...(showSeconds && { second: '2-digit' }),
      hour12: false, // Use 24-hour format for European style
      timeZone: activeTimezone
    }

    return date.toLocaleTimeString(locale === 'it' ? 'it-IT' : locale === 'es' ? 'es-ES' : 'en-GB', options)
  }

  // Format date based on locale
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: compact ? 'short' : 'long',
      year: 'numeric',
      month: compact ? 'short' : 'long',
      day: 'numeric',
    }

    return date.toLocaleDateString(locale === 'it' ? 'it-IT' : locale === 'es' ? 'es-ES' : 'en-GB', options)
  }

  // Format date in DD/MM/YYYY format for compact view with timezone support
  const formatDateCompact = (date: Date) => {
    const activeTimezone = manualTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone

    // Create a date in the correct timezone
    const dateInTimezone = new Date(date.toLocaleString("en-US", { timeZone: activeTimezone }))

    const day = String(dateInTimezone.getDate()).padStart(2, '0')
    const month = String(dateInTimezone.getMonth() + 1).padStart(2, '0')
    const year = dateInTimezone.getFullYear()
    return `${day}/${month}/${year}`
  }

  // Get timezone information with enhanced features
  const getTimezone = () => {
    // Use manual timezone if provided, otherwise detect automatically
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const activeTimezone = manualTimezone || detectedTimezone

    // Get short timezone name
    const shortTimezone = currentTime.toLocaleTimeString('en', {
      timeZone: activeTimezone,
      timeZoneName: 'short'
    }).split(' ')[2]

    // Get long timezone name for display
    const longTimezone = currentTime.toLocaleTimeString('en', {
      timeZone: activeTimezone,
      timeZoneName: 'long'
    }).split(' ').slice(2).join(' ')

    // Determine if timezone was manually set or auto-detected
    const isAutoDetected = !manualTimezone

    return {
      full: activeTimezone,
      short: shortTimezone,
      long: longTimezone,
      isAutoDetected,
      detected: detectedTimezone
    }
  }

  const timezone = getTimezone()

  if (compact) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 border border-purple-200 shadow-sm relative">
          <Clock className="h-6 w-6 text-purple-600" />
          {showTimezoneIndicator && (
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-sm flex items-center justify-center">
              {timezone.isAutoDetected ? (
                <Globe className="h-1.5 w-1.5 text-white" />
              ) : (
                <MapPin className="h-1.5 w-1.5 text-white" />
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end text-right">
          {/* Prima orario (più grande), poi data */}
          <div className="flex items-center space-x-3">
            <div className="font-mono font-bold text-xl text-purple-700">
              {formatTime(currentTime)}
            </div>
            <div className="font-mono font-bold text-lg text-gray-900">
              {formatDateCompact(currentTime)}
            </div>
          </div>
          {showTimezone && (
            <div className="flex items-center space-x-2 mt-1">
              <div className="text-xs text-gray-500 font-medium px-2 py-0.5 bg-gray-100 rounded-full">
                {showFullTimezone ? timezone.full : timezone.short}
              </div>
              {showTimezoneIndicator && (
                <div className="text-xs text-gray-400 flex items-center space-x-1">
                  {timezone.isAutoDetected ? (
                    <>
                      <Globe className="h-2.5 w-2.5" />
                      <span>Auto</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="h-2.5 w-2.5" />
                      <span>Manual</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-omnia/10 relative">
        <Clock className="h-4 w-4 text-omnia" />
        {showTimezoneIndicator && (
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border border-white shadow-sm flex items-center justify-center">
            {timezone.isAutoDetected ? (
              <Globe className="h-1 w-1 text-white" />
            ) : (
              <MapPin className="h-1 w-1 text-white" />
            )}
          </div>
        )}
      </div>
      <div className="flex flex-col">
        <div className="text-sm font-medium text-foreground">
          {formatDate(currentTime)}
        </div>
        <div className="flex items-center space-x-2">
          <span className="font-mono text-sm font-semibold text-omnia">
            {formatTime(currentTime)}
          </span>
          {showTimezone && (
            <div className="flex items-center space-x-1">
              <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                {showFullTimezone ? timezone.full : timezone.short}
              </span>
              {showTimezoneIndicator && (
                <div className="text-xs text-muted-foreground flex items-center space-x-0.5">
                  {timezone.isAutoDetected ? (
                    <>
                      <Globe className="h-2 w-2" />
                      <span className="text-xs">Auto</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="h-2 w-2" />
                      <span className="text-xs">Manual</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}