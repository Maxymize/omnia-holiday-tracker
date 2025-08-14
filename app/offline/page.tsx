"use client"

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WifiOff, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function OfflinePage() {
  const router = useRouter()

  const handleRetry = () => {
    window.location.reload()
  }

  const handleGoHome = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-orange-100 rounded-full w-fit">
            <WifiOff className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Connessione Assente
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-gray-600">
              Non è possibile connettersi a internet. Alcune funzionalità potrebbero non essere disponibili.
            </p>
            <p className="text-sm text-gray-500">
              I dati salvati localmente sono ancora accessibili.
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleRetry}
              className="w-full"
              variant="default"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Riprova
            </Button>
            
            <Button 
              onClick={handleGoHome}
              className="w-full"
              variant="outline"
            >
              <Home className="h-4 w-4 mr-2" />
              Torna alla Home
            </Button>
          </div>

          <div className="mt-6 p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">
              Funzionalità Offline Disponibili:
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Visualizzazione calendario ferie salvate</li>
              <li>• Consultazione storico richieste</li>
              <li>• Informazioni profilo</li>
            </ul>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Omnia Holiday Tracker • Versione Offline
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}