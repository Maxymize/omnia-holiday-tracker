"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Calendar, 
  Home, 
  Plus, 
  Clock, 
  Users, 
  Settings, 
  FileText,
  BarChart3,
  Building,
  CheckSquare,
  X
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils/cn"

interface NavigationItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
  adminOnly?: boolean
}

interface DashboardSidebarProps {
  isOpen: boolean
  onClose?: () => void
  userRole: "admin" | "employee"
  className?: string
}

const employeeNavigation: NavigationItem[] = [
  {
    title: "Dashboard",
    href: "/employee-dashboard",
    icon: Home,
  },
  {
    title: "Calendario",
    href: "/employee-dashboard/calendar",
    icon: Calendar,
  },
  {
    title: "Nuova Richiesta",
    href: "/employee-dashboard/new-request",
    icon: Plus,
  },
  {
    title: "Le Mie Richieste",
    href: "/employee-dashboard/requests",
    icon: Clock,
  },
  {
    title: "Profilo",
    href: "/employee-dashboard/profile",
    icon: Users,
  },
]

const adminNavigation: NavigationItem[] = [
  {
    title: "Dashboard",
    href: "/admin-dashboard",
    icon: Home,
  },
  {
    title: "Calendario Generale",
    href: "/admin-dashboard/calendar",
    icon: Calendar,
  },
  {
    title: "Richieste Pendenti",
    href: "/admin-dashboard/pending",
    icon: Clock,
    badge: 3, // This would come from props
  },
  {
    title: "Dipendenti",
    href: "/admin-dashboard/employees",
    icon: Users,
  },
  {
    title: "Dipartimenti",
    href: "/admin-dashboard/departments",
    icon: Building,
  },
  {
    title: "Approvazioni",
    href: "/admin-dashboard/approvals",
    icon: CheckSquare,
  },
  {
    title: "Report",
    href: "/admin-dashboard/reports",
    icon: BarChart3,
  },
  {
    title: "Impostazioni",
    href: "/admin-dashboard/settings",
    icon: Settings,
  },
]

export function DashboardSidebar({
  isOpen,
  onClose,
  userRole,
  className,
}: DashboardSidebarProps) {
  const pathname = usePathname()

  const navigation = userRole === "admin" ? adminNavigation : employeeNavigation

  const isCurrentPath = (href: string) => {
    if (href === "/employee-dashboard" || href === "/admin-dashboard") {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-64 transform bg-card border-r transition-transform duration-200 ease-in-out md:relative md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className
        )}
      >
        {/* Close button for mobile */}
        <div className="flex items-center justify-between p-4 border-b md:hidden">
          <h2 className="text-lg font-semibold">Menu</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1 p-4">
          <nav className="space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  isCurrentPath(item.href)
                    ? "bg-omnia text-white hover:bg-omnia/90"
                    : "text-muted-foreground"
                )}
                onClick={() => {
                  // Close mobile sidebar when navigation item is clicked
                  if (window.innerWidth < 768) {
                    onClose?.()
                  }
                }}
              >
                <item.icon className="h-5 w-5" />
                <span className="flex-1">{item.title}</span>
                {item.badge && item.badge > 0 && (
                  <Badge
                    variant={isCurrentPath(item.href) ? "secondary" : "default"}
                    className="ml-auto"
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            ))}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t p-4">
          <div className="text-xs text-muted-foreground">
            <p className="font-medium">Omnia Holiday Tracker</p>
            <p>Version 1.0.0</p>
          </div>
        </div>
      </aside>
    </>
  )
}