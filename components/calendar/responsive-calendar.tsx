"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { IntegratedCalendar, CalendarLegend } from "./integrated-calendar"
import { MobileCalendar } from "./mobile-calendar"

interface ResponsiveCalendarProps {
  className?: string
  showAddButton?: boolean
  showTeamHolidays?: boolean
  onHolidayCreated?: () => void
  showLegend?: boolean
}

export function ResponsiveCalendar({
  className,
  showAddButton = true,
  showTeamHolidays = true,
  onHolidayCreated,
  showLegend = true,
}: ResponsiveCalendarProps) {
  const [isMobile, setIsMobile] = useState(false)

  // Check screen size on mount and resize
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }

    // Check on mount
    checkScreenSize()

    // Check on resize
    window.addEventListener('resize', checkScreenSize)

    return () => {
      window.removeEventListener('resize', checkScreenSize)
    }
  }, [])

  // Don't render until we know the screen size to prevent hydration mismatch
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Return a placeholder while determining screen size
    return (
      <div className={className}>
        <div className="animate-pulse bg-gray-200 rounded-lg h-[500px]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Calendar Component */}
      {isMobile ? (
        <MobileCalendar
          className={className}
          showAddButton={showAddButton}
          showTeamHolidays={showTeamHolidays}
          onHolidayCreated={onHolidayCreated}
        />
      ) : (
        <IntegratedCalendar
          className={className}
          showTeamHolidays={showTeamHolidays}
          onHolidayCreated={onHolidayCreated}
        />
      )}

      {/* Legend - only show on desktop */}
      {showLegend && !isMobile && (
        <CalendarLegend />
      )}
    </div>
  )
}

export { CalendarLegend } from "./integrated-calendar"