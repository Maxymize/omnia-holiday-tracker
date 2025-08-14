"use client"

import { useEffect, useRef, useCallback } from 'react'

interface TouchGestureOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onPinch?: (scale: number) => void
  onTap?: () => void
  onDoubleTap?: () => void
  onLongPress?: () => void
  threshold?: number
  longPressDelay?: number
}

interface TouchPoint {
  x: number
  y: number
  time: number
}

export function useMobileGestures<T extends HTMLElement>(
  options: TouchGestureOptions = {}
) {
  const elementRef = useRef<T>(null)
  const touchStartRef = useRef<TouchPoint | null>(null)
  const lastTapRef = useRef<number>(0)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const initialPinchDistanceRef = useRef<number>(0)

  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onPinch,
    onTap,
    onDoubleTap,
    onLongPress,
    threshold = 50,
    longPressDelay = 500
  } = options

  // Calculate distance between two touch points
  const getDistance = useCallback((touch1: Touch, touch2: Touch) => {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }, [])

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0]
    
    if (e.touches.length === 1) {
      // Single touch - record start position
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      }

      // Start long press timer
      if (onLongPress) {
        longPressTimerRef.current = setTimeout(() => {
          onLongPress()
        }, longPressDelay)
      }
    } else if (e.touches.length === 2 && onPinch) {
      // Two fingers - record initial pinch distance
      initialPinchDistanceRef.current = getDistance(e.touches[0], e.touches[1])
    }

    // Clear any existing long press timer if more than one touch
    if (e.touches.length > 1 && longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [onLongPress, onPinch, longPressDelay, getDistance])

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    // Clear long press timer on move
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    if (e.touches.length === 2 && onPinch && initialPinchDistanceRef.current > 0) {
      // Handle pinch gesture
      const currentDistance = getDistance(e.touches[0], e.touches[1])
      const scale = currentDistance / initialPinchDistanceRef.current
      onPinch(scale)
    }

    // Prevent default to avoid scrolling during gestures
    if (e.touches.length > 1) {
      e.preventDefault()
    }
  }, [onPinch, getDistance])

  // Handle touch end
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    if (!touchStartRef.current || e.touches.length > 0) {
      return
    }

    const touch = e.changedTouches[0]
    const touchEnd = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    }

    const deltaX = touchEnd.x - touchStartRef.current.x
    const deltaY = touchEnd.y - touchStartRef.current.y
    const deltaTime = touchEnd.time - touchStartRef.current.time
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    // Check for swipe gestures
    if (distance > threshold && deltaTime < 300) {
      const absDeltaX = Math.abs(deltaX)
      const absDeltaY = Math.abs(deltaY)

      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight()
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft()
        }
      } else {
        // Vertical swipe
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown()
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp()
        }
      }
    } else if (distance < threshold && deltaTime < 300) {
      // Tap gesture
      const now = Date.now()
      const timeSinceLastTap = now - lastTapRef.current

      if (timeSinceLastTap < 300 && onDoubleTap) {
        // Double tap
        onDoubleTap()
        lastTapRef.current = 0 // Reset to prevent triple tap
      } else {
        // Single tap
        if (onTap) {
          onTap()
        }
        lastTapRef.current = now
      }
    }

    // Reset touch start
    touchStartRef.current = null
    initialPinchDistanceRef.current = 0
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onTap, onDoubleTap, threshold])

  // Setup event listeners
  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    // Add passive listeners for better performance
    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      
      // Clean up timer
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return elementRef
}

// Hook for detecting mobile device
export function useIsMobile() {
  const isMobile = useCallback(() => {
    if (typeof window === 'undefined') return false
    
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth < 768
  }, [])

  return isMobile()
}

// Hook for detecting PWA installation
export function useIsPWA() {
  const isPWA = useCallback(() => {
    if (typeof window === 'undefined') return false
    
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    )
  }, [])

  return isPWA()
}

// Hook for PWA install prompt
export function usePWAInstall() {
  const installPromptRef = useRef<any>(null)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Save the event so it can be triggered later
      installPromptRef.current = e
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const showInstallPrompt = useCallback(async () => {
    if (!installPromptRef.current) {
      return false
    }

    // Show the install prompt
    installPromptRef.current.prompt()
    
    // Wait for the user to respond to the prompt
    const result = await installPromptRef.current.userChoice
    
    // Clear the saved prompt since it can't be used again
    installPromptRef.current = null
    
    return result.outcome === 'accepted'
  }, [])

  return {
    canInstall: !!installPromptRef.current,
    showInstallPrompt
  }
}