"use client"

import * as React from "react"
import { format, addDays } from "date-fns"
import { it, enUS, es } from "date-fns/locale"
import { motion } from "framer-motion"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { 
  Calendar,
  Clock,
  User,
  FileText,
  CheckCircle,
  XCircle,
  Edit,
  Trash2
} from "lucide-react"
import { useI18n } from "@/lib/i18n/provider"
import { useAuth } from "@/lib/hooks/useAuth"
import { getTypeIcon, getStatusIcon } from "@/lib/utils/calendar-utils"

interface HolidayEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: {
    userId: string
    userName: string
    type: "vacation" | "sick" | "personal"
    status: "pending" | "approved" | "rejected" | "cancelled"
    workingDays: number
    notes?: string
    createdAt: string
    approvedBy?: string
  }
}

interface HolidayEventDetailsProps {
  event: HolidayEvent
  onEdit?: (event: HolidayEvent) => void
  onCancel?: (event: HolidayEvent) => void
  onApprove?: (event: HolidayEvent) => void
  onReject?: (event: HolidayEvent) => void
  showActions?: boolean
  className?: string
}

export function HolidayEventDetails({
  event,
  onEdit,
  onCancel,
  onApprove,
  onReject,
  showActions = true,
  className
}: HolidayEventDetailsProps) {
  const { t, locale } = useI18n()
  const { user, isAdmin } = useAuth()

  // Get locale for date-fns
  const getDateFnsLocale = () => {
    switch (locale) {
      case 'it': return it
      case 'es': return es
      default: return enUS
    }
  }

  const isOwnEvent = user?.id === event.resource.userId
  const canEdit = isOwnEvent && (event.resource.status === 'pending' || event.resource.status === 'rejected')
  const canCancel = isOwnEvent && (event.resource.status === 'pending' || event.resource.status === 'approved')
  const canApprove = isAdmin && event.resource.status === 'pending'

  // Get user initials for avatar
  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Format date range
  const formatDateRange = () => {
    const startFormatted = format(event.start, "dd MMMM yyyy", { locale: getDateFnsLocale() })
    const endFormatted = format(event.end, "dd MMMM yyyy", { locale: getDateFnsLocale() })
    
    if (startFormatted === endFormatted) {
      return startFormatted
    }
    
    return `${startFormatted} - ${endFormatted}`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={className}
    >
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                  {getUserInitials(event.resource.userName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <span>{event.resource.userName}</span>
                  <span className="text-xl">{getTypeIcon(event.resource.type)}</span>
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {t(`holidays.request.types.${event.resource.type}`)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <StatusBadge status={event.resource.status} />
              <span className="text-lg">{getStatusIcon(event.resource.status)}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Date and Duration Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Periodo</p>
                <p className="font-medium">{formatDateRange()}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Giorni lavorativi</p>
                <p className="font-medium">
                  {event.resource.workingDays} 
                  <span className="text-sm text-gray-500 ml-1">
                    {event.resource.workingDays === 1 ? 'giorno' : 'giorni'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Request Details */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Richiesto da:</span>
              <span className="font-medium">{event.resource.userName}</span>
            </div>

            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Data richiesta:</span>
              <span className="font-medium">
                {format(new Date(event.resource.createdAt), "dd MMMM yyyy 'alle' HH:mm", { locale: getDateFnsLocale() })}
              </span>
            </div>

            {event.resource.approvedBy && (
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-gray-600">Approvato da:</span>
                <span className="font-medium">{event.resource.approvedBy}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          {event.resource.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Note:</span>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-gray-700">{event.resource.notes}</p>
                </div>
              </div>
            </>
          )}

          {/* Status-specific information */}
          {event.resource.status === 'rejected' && (
            <>
              <Separator />
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-700">Richiesta rifiutata</span>
                </div>
                <p className="text-sm text-red-600">
                  Questa richiesta è stata rifiutata. Puoi modificarla e reinviarla se necessario.
                </p>
              </div>
            </>
          )}

          {event.resource.status === 'pending' && isAdmin && (
            <>
              <Separator />
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium text-orange-700">In attesa di approvazione</span>
                </div>
                <p className="text-sm text-orange-600">
                  Questa richiesta necessita della tua approvazione come amministratore.
                </p>
              </div>
            </>
          )}

          {/* Action Buttons */}
          {showActions && (
            <>
              <Separator />
              <div className="flex flex-wrap gap-2">
                {canEdit && onEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(event)}
                    className="flex items-center space-x-2"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Modifica</span>
                  </Button>
                )}

                {canCancel && onCancel && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCancel(event)}
                    className="flex items-center space-x-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Annulla</span>
                  </Button>
                )}

                {canApprove && onApprove && (
                  <Button
                    size="sm"
                    onClick={() => onApprove(event)}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Approva</span>
                  </Button>
                )}

                {canApprove && onReject && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onReject(event)}
                    className="flex items-center space-x-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4" />
                    <span>Rifiuta</span>
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Compact version for list views
export function CompactHolidayEventDetails({
  event,
  onEdit,
  onCancel,
  showActions = false,
  className
}: Omit<HolidayEventDetailsProps, 'onApprove' | 'onReject'>) {
  const { t, locale } = useI18n()
  const { user } = useAuth()

  const getDateFnsLocale = () => {
    switch (locale) {
      case 'it': return it
      case 'es': return es
      default: return enUS
    }
  }

  const isOwnEvent = user?.id === event.resource.userId
  const canEdit = isOwnEvent && (event.resource.status === 'pending' || event.resource.status === 'rejected')
  const canCancel = isOwnEvent && (event.resource.status === 'pending' || event.resource.status === 'approved')

  return (
    <div className={`p-3 border rounded-lg hover:bg-gray-50 transition-colors ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getTypeIcon(event.resource.type)}</span>
          <h4 className="font-medium text-sm">{event.resource.userName}</h4>
          <Badge variant="secondary" className="text-xs">
            {t(`holidays.request.types.${event.resource.type}`)}
          </Badge>
        </div>
        <StatusBadge status={event.resource.status} />
      </div>
      
      <div className="text-xs text-gray-600 space-y-1">
        <p>
          <strong>Periodo:</strong> {format(event.start, 'dd/MM/yyyy')} - {format(event.end, 'dd/MM/yyyy')}
        </p>
        <p>
          <strong>Giorni:</strong> {event.resource.workingDays}
        </p>
        {event.resource.notes && (
          <p>
            <strong>Note:</strong> {event.resource.notes}
          </p>
        )}
      </div>

      {showActions && (canEdit || canCancel) && (
        <div className="flex space-x-2 mt-3">
          {canEdit && onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(event)}
              className="h-7 text-xs"
            >
              <Edit className="h-3 w-3 mr-1" />
              Modifica
            </Button>
          )}
          {canCancel && onCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCancel(event)}
              className="h-7 text-xs text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Annulla
            </Button>
          )}
        </div>
      )}
    </div>
  )
}