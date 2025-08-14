"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { usePWAInstall, useIsMobile, useIsPWA } from '@/lib/hooks/useMobileGestures'
import { useI18n } from '@/lib/i18n/provider'

interface PWAInstallBannerProps {
  className?: string
  onInstall?: () => void
  onDismiss?: () => void
}

export function PWAInstallBanner({ 
  className, 
  onInstall, 
  onDismiss 
}: PWAInstallBannerProps) {
  const { t } = useI18n()
  const isMobile = useIsMobile()
  const isPWA = useIsPWA()
  const { canInstall, showInstallPrompt } = usePWAInstall()
  
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Check if user has already dismissed the banner
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      setIsDismissed(true)
      return
    }

    // Show banner if:
    // 1. User is on mobile
    // 2. App is not already installed as PWA
    // 3. Browser supports PWA installation
    // 4. User hasn't dismissed it
    if (isMobile && !isPWA && canInstall && !isDismissed) {
      // Show banner after a short delay
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [isMobile, isPWA, canInstall, isDismissed])

  const handleInstall = async () => {
    try {
      const installed = await showInstallPrompt()
      if (installed) {
        setIsVisible(false)
        onInstall?.()
        // Don't show banner again
        localStorage.setItem('pwa-install-dismissed', 'true')
      }
    } catch (error) {
      console.error('PWA installation failed:', error)
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
    setIsDismissed(true)
    onDismiss?.()
    // Remember dismissal for 7 days
    const dismissalTime = Date.now() + (7 * 24 * 60 * 60 * 1000)
    localStorage.setItem('pwa-install-dismissed', dismissalTime.toString())
  }

  // Don't show if conditions aren't met
  if (!isMobile || isPWA || !canInstall || isDismissed) {
    return null
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm"
        >
          <Card className="bg-gradient-to-r from-blue-50 to-emerald-50 border-blue-200 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 p-2 rounded-full flex-shrink-0">
                  <Smartphone className="h-5 w-5 text-blue-600" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-gray-900 mb-1">
                    Installa Omnia Holidays
                  </h3>
                  <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                    Aggiungi l&apos;app alla tua schermata home per un accesso rapido alle tue ferie.
                  </p>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      onClick={handleInstall}
                      className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Installa
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDismiss}
                      className="h-8 px-2 text-xs text-gray-500 hover:text-gray-700"
                    >
                      Chiudi
                    </Button>
                  </div>
                </div>
                
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="h-6 w-6 text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Alternative compact version for header/navigation
export function PWAInstallButton({ className }: { className?: string }) {
  const isMobile = useIsMobile()
  const isPWA = useIsPWA()
  const { canInstall, showInstallPrompt } = usePWAInstall()

  const handleInstall = async () => {
    try {
      await showInstallPrompt()
    } catch (error) {
      console.error('PWA installation failed:', error)
    }
  }

  // Don't show if conditions aren't met
  if (!isMobile || isPWA || !canInstall) {
    return null
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleInstall}
      className={className}
    >
      <Download className="h-4 w-4 mr-2" />
      Installa App
    </Button>
  )
}