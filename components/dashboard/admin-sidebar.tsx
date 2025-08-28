'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp,
  Calendar, 
  Users, 
  FileText,
  Settings,
  Building2,
  BarChart3,
  Bell,
  LogOut,
  Menu,
  X,
  AlertTriangle,
  Shield,
  CalendarCheck
} from 'lucide-react';

export interface AdminStats {
  totalEmployees?: number;
  pendingEmployees?: number;
  pendingRequests?: number;
  holidaysThisMonth?: number;
  employeesOnHolidayToday?: number;
}

type AdminTabType = 'overview' | 'calendar' | 'employees' | 'requests' | 'my-requests' | 'departments' | 'reports' | 'settings';

interface AdminSidebarProps {
  adminStats?: AdminStats;
  activeTab?: AdminTabType;
  onTabChange?: (tab: AdminTabType) => void;
}

export function AdminSidebar({ adminStats, activeTab = 'overview', onTabChange }: AdminSidebarProps) {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getUserInitials = (name?: string) => {
    if (!name) return 'A';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleTabClick = (tab: AdminTabType) => {
    onTabChange?.(tab);
    setIsMobileMenuOpen(false); // Close mobile menu on tab change
  };

  const navigationItems: Array<{
    id: AdminTabType;
    label: string;
    icon: any;
    description: string;
    badge?: number;
  }> = [
    {
      id: 'overview',
      label: 'Panoramica',
      icon: TrendingUp,
      description: 'Statistiche generali',
      badge: adminStats?.pendingEmployees && adminStats.pendingEmployees > 0 ? adminStats.pendingEmployees : undefined
    },
    {
      id: 'calendar',
      label: 'Calendario',
      icon: Calendar,
      description: 'Vista generale ferie',
      badge: adminStats?.employeesOnHolidayToday && adminStats.employeesOnHolidayToday > 0 ? adminStats.employeesOnHolidayToday : undefined
    },
    {
      id: 'employees',
      label: 'Dipendenti',
      icon: Users,
      description: 'Gestione utenti',
      badge: adminStats?.pendingEmployees && adminStats.pendingEmployees > 0 ? adminStats.pendingEmployees : undefined
    },
    {
      id: 'requests',
      label: 'Richieste',
      icon: FileText,
      description: 'Approvazioni ferie',
      badge: adminStats?.pendingRequests && adminStats.pendingRequests > 0 ? adminStats.pendingRequests : undefined
    },
    {
      id: 'my-requests',
      label: 'Le Mie Richieste',
      icon: CalendarCheck,
      description: 'Le mie ferie e statistiche'
    },
    {
      id: 'departments',
      label: 'Dipartimenti',
      icon: Building2,
      description: 'Gestione reparti',
    },
    {
      id: 'reports',
      label: 'Report',
      icon: BarChart3,
      description: 'Analisi e statistiche',
    },
    {
      id: 'settings',
      label: 'Impostazioni',
      icon: Settings,
      description: 'Configurazione sistema',
    }
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Admin Profile */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <Avatar className="h-12 w-12 border-2 border-purple-200">
            {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
            <AvatarFallback className="text-lg font-medium bg-purple-100 text-purple-700">
              {getUserInitials(user?.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {user?.name || 'Amministratore'}
              </h3>
              <Shield className="h-4 w-4 text-purple-600" />
            </div>
            <p className="text-xs text-gray-600 truncate">{user?.email}</p>
            <Badge variant="secondary" className="mt-1 text-xs bg-purple-100 text-purple-700">
              Amministratore
            </Badge>
          </div>
        </div>
      </div>


      {/* Navigation */}
      <nav className="flex-1 p-4">
        <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wider mb-3">
          Amministrazione
        </h4>
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`
                  w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors
                  ${isActive 
                    ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{item.label}</div>
                    <div className="text-xs text-gray-600 truncate">{item.description}</div>
                  </div>
                </div>
                {item.badge && item.badge > 0 && (
                  <Badge 
                    variant="outline" 
                    className="bg-red-100 text-red-800 border-red-200 text-xs px-2 py-0.5"
                  >
                    {item.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200">
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-red-700 hover:text-red-900 hover:bg-red-50"
            onClick={logout}
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
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="bg-white shadow-md"
        >
          {isMobileMenuOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-80 lg:block">
        <div className="flex flex-col h-full bg-white border-r border-gray-200 shadow-sm">
          <SidebarContent />
        </div>
      </div>

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-25"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="relative flex flex-col w-80 bg-white shadow-xl h-full max-h-screen overflow-y-auto overscroll-contain">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}