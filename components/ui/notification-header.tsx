'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/lib/i18n/provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Bell, 
  BellRing, 
  X, 
  FileText, 
  UserCheck, 
  CheckCircle, 
  XCircle, 
  Calendar,
  Clock,
  User,
  Mail,
  Activity,
  Trash2
} from 'lucide-react';

// Interfacce TypeScript per le notifiche (corrispondenti alle attività)
interface NotificationActivity {
  id: string;
  type: 'holiday_request' | 'employee_registration' | 'holiday_approved' | 'holiday_rejected';
  title: string;
  description: string;
  date: string;
  user: {
    name: string;
    email: string;
  };
  status?: string;
}

interface NotificationHeaderProps {
  activities: NotificationActivity[];
  loading?: boolean;
  onMarkAsRead?: () => void;
  onDeleteNotification?: (id: string) => Promise<void>;
  className?: string;
}

export function NotificationHeader({
  activities,
  loading = false,
  onMarkAsRead,
  onDeleteNotification,
  className = ""
}: NotificationHeaderProps) {
  const { t } = useTranslation();
  
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadTimestamp, setLastReadTimestamp] = useState<number>(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Carica timestamp ultima lettura dal localStorage
  useEffect(() => {
    const saved = localStorage.getItem('notifications_last_read');
    if (saved) {
      setLastReadTimestamp(parseInt(saved));
    }
  }, []);

  // Calcola il numero di notifiche non lette basandosi sul timestamp
  useEffect(() => {
    if (activities.length === 0) {
      setUnreadCount(0);
      return;
    }

    const newActivities = activities.filter(activity => {
      const activityTime = new Date(activity.date).getTime();
      return activityTime > lastReadTimestamp;
    });
    
    setUnreadCount(Math.min(newActivities.length, 10)); // Max 10 nel badge
  }, [activities, lastReadTimestamp]);

  // Gestione click fuori dal dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Gestione apertura dropdown - auto reset badge
  const handleToggleDropdown = () => {
    setIsOpen(!isOpen);
    
    // Salva timestamp quando si apre il dropdown per la prima volta
    if (!isOpen) {
      const now = Date.now();
      setLastReadTimestamp(now);
      localStorage.setItem('notifications_last_read', now.toString());
      setUnreadCount(0);
      
      if (onMarkAsRead) {
        onMarkAsRead();
      }
    }
  };

  // Utility per ottenere icona e stile del tipo di attività
  const getActivityTypeInfo = (type: NotificationActivity['type']) => {
    switch (type) {
      case 'holiday_request':
        return {
          label: t('notifications.types.holiday_request'),
          icon: FileText,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
        };
      case 'employee_registration':
        return {
          label: t('notifications.types.employee_registration'),
          icon: UserCheck,
          color: 'text-purple-600',
          bgColor: 'bg-purple-100',
        };
      case 'holiday_approved':
        return {
          label: t('notifications.types.holiday_approved'),
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
        };
      case 'holiday_rejected':
        return {
          label: t('notifications.types.holiday_rejected'),
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
        };
      default:
        return {
          label: t('notifications.types.default'),
          icon: Activity,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
        };
    }
  };

  // Formatta la data per le notifiche
  const formatNotificationDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return 'Proprio ora';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m fa`;
    } else if (diffHours < 24) {
      return `${diffHours}h fa`;
    } else if (diffDays === 1) {
      return 'Ieri';
    } else if (diffDays < 7) {
      return `${diffDays}g fa`;
    } else {
      return date.toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'short'
      });
    }
  };

  // Troncamento del testo per le descrizioni lunghe
  const truncateText = (text: string, maxLength: number = 60) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bottone Notifiche con Badge */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggleDropdown}
        className="relative p-2 hover:bg-gray-100 transition-colors"
        aria-label={t('notifications.actions.openNotifications')}
      >
        {unreadCount > 0 ? (
          <BellRing className="h-5 w-5 text-gray-700" />
        ) : (
          <Bell className="h-5 w-5 text-gray-700" />
        )}
        
        {/* Badge numerico */}
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-medium min-w-[20px]"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Dropdown delle Notifiche */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50">
          <Card className="w-96 shadow-lg border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <span>Notifiche</span>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6 p-0 hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {activities.length > 0 && (
                <p className="text-sm text-gray-600">
                  {activities.length} attività recenti
                </p>
              )}
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                // Loading state
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-pulse space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : activities.length === 0 ? (
                // Empty state
                <div className="p-6 text-center text-gray-500">
                  <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="font-medium">Nessuna notifica</p>
                  <p className="text-sm">Le nuove attività appariranno qui</p>
                </div>
              ) : (
                // Lista notifiche (prime 10 attività)
                <ScrollArea className="max-h-80 overflow-y-auto">
                  <div className="py-2">
                    {activities.slice(0, 10).map((activity, index) => {
                      const typeInfo = getActivityTypeInfo(activity.type);
                      const IconComponent = typeInfo.icon;

                      return (
                        <div key={activity.id} className="relative group">
                          <div className="flex items-start space-x-3 p-3 hover:bg-gray-50 transition-colors">
                            {/* Icona tipo attività */}
                            <div className={`p-1.5 rounded-full ${typeInfo.bgColor} flex-shrink-0 mt-0.5`}>
                              <IconComponent className={`h-3.5 w-3.5 ${typeInfo.color}`} />
                            </div>

                            {/* Contenuto notifica */}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-gray-900 truncate">
                                {activity.title}
                              </h4>
                              <p className="text-sm text-gray-600 mt-0.5 leading-tight">
                                {truncateText(activity.description)}
                              </p>
                              <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500">
                                <User className="h-3 w-3" />
                                <span className="truncate max-w-24">{activity.user.name}</span>
                                <span>•</span>
                                <Clock className="h-3 w-3" />
                                <span>{formatNotificationDate(activity.date)}</span>
                              </div>
                            </div>

                            {/* Pulsante elimina (visibile on hover) */}
                            {onDeleteNotification && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await onDeleteNotification(activity.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
                                aria-label={t('notifications.actions.deleteNotification')}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          
                          {/* Separatore (non per l'ultimo elemento) */}
                          {index < Math.min(activities.length, 10) - 1 && (
                            <Separator className="ml-12" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}

              {/* Footer con link alle attività complete */}
              {activities.length > 10 && (
                <>
                  <Separator />
                  <div className="p-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-center text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      onClick={() => {
                        setIsOpen(false);
                        // Qui si potrebbe navigare alla pagina delle attività complete
                        // o attivare il tab overview
                      }}
                    >
                      Visualizza tutte le attività ({activities.length})
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}