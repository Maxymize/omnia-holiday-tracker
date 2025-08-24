'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/provider';
import { useAuth } from '@/lib/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  BarChart3, 
  User, 
  Plus, 
  Clock, 
  CheckCircle, 
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmployeeSidebarProps {
  holidayStats?: {
    pendingRequests: number;
    upcomingHolidays: number;
    remainingDays: number;
  };
  className?: string;
}

export function EmployeeSidebar({ holidayStats, className }: EmployeeSidebarProps) {
  const { t, locale } = useTranslation();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const getUserInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusColor = (remaining: number) => {
    if (remaining <= 5) return 'bg-red-500';
    if (remaining <= 10) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const navigationItems = [
    {
      label: 'Dashboard',
      href: `/${locale}/employee-dashboard`,
      icon: Home,
      description: 'Panoramica generale'
    },
    {
      label: 'Calendario',
      href: `/${locale}/employee-dashboard?tab=calendar`,
      icon: Calendar,
      description: 'Visualizza calendario ferie',
      badge: holidayStats?.upcomingHolidays
    },
    {
      label: 'Le Mie Richieste',
      href: `/${locale}/employee-dashboard?tab=requests`,
      icon: FileText,
      description: 'Storico richieste ferie',
      badge: holidayStats?.pendingRequests
    },
    {
      label: 'Profilo',
      href: `/${locale}/employee-dashboard?tab=profile`,
      icon: User,
      description: 'Informazioni personali'
    },
  ];

  const quickActions = [
    {
      label: 'Nuova Richiesta',
      href: `/${locale}/holiday-request`,
      icon: Plus,
      variant: 'default' as const,
      description: 'Richiedi nuove ferie'
    },
  ];

  const isActive = (href: string) => {
    if (href.includes('?tab=')) {
      const [basePath, tabParam] = href.split('?tab=');
      const currentTab = searchParams.get('tab');
      
      // If we're on the base path, check if the current tab matches the target tab
      if (pathname === basePath) {
        return currentTab === tabParam;
      }
      return false;
    }
    // For non-tab navigation items (like dashboard root)
    // Only active when on the exact path with NO tab parameter
    return pathname === href && !searchParams.get('tab');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* User Profile Section */}
      <div className="p-4 border-b">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="text-sm font-medium bg-blue-100 text-blue-700">
              {getUserInitials(user?.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {user?.name || 'Dipendente'}
            </h3>
            <p className="text-xs text-gray-600 truncate">
              {user?.email}
            </p>
          </div>
        </div>

        {/* Quick Status */}
        {holidayStats && (
          <div className="mt-3 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1">
              <div className={cn(
                "w-2 h-2 rounded-full",
                getStatusColor(holidayStats.remainingDays)
              )}></div>
              <span className="text-gray-600">
                {holidayStats.remainingDays} giorni rimasti
              </span>
            </div>
            {holidayStats.pendingRequests > 0 && (
              <Badge variant="secondary" className="text-xs">
                {holidayStats.pendingRequests} in attesa
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-b">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
          Azioni Rapide
        </h4>
        <div className="space-y-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <Button
                  variant={action.variant}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setIsMobileOpen(false)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {action.label}
                </Button>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-4">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
          Navigazione
        </h4>
        <nav className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors group",
                    active
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                  onClick={() => setIsMobileOpen(false)}
                >
                  <Icon className={cn(
                    "h-4 w-4 flex-shrink-0",
                    active ? "text-blue-700" : "text-gray-500 group-hover:text-gray-700"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.label}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {item.description}
                    </div>
                  </div>
                  {item.badge && item.badge > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Actions */}
      <div className="p-4 border-t">
        <div className="space-y-2">
          <Link href={`/${locale}/employee-dashboard?tab=settings`}>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => setIsMobileOpen(false)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Impostazioni
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => {
              logout();
              setIsMobileOpen(false);
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Esci
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileOpen(true)}
          className="bg-white shadow-md"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={cn(
        "lg:hidden fixed inset-y-0 left-0 w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <SidebarContent />
      </div>

      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-80 lg:bg-white lg:border-r lg:border-gray-200",
        className
      )}>
        <SidebarContent />
      </div>
    </>
  );
}