'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  Users, 
  Mail, 
  Settings,
  ChevronRight,
  Menu,
  X,
  FileText,
  Database
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, description: 'Übersicht und Metriken' },
  { name: 'Leads', href: '/leads', icon: Users, description: 'Kontakte verwalten' },
  { name: 'Sequenzen', href: '/sequences', icon: Mail, description: 'E-Mail-Sequenzen erstellen' },
  { name: 'Formulare', href: '/forms', icon: FileText, description: 'Anmeldeformulare erstellen' },
  { name: 'EsySync', href: '/esysync', icon: Database, description: 'User aus EsySync importieren' },
  { name: 'Einstellungen', href: '/settings', icon: Settings, description: 'App konfigurieren' },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-background">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex h-16 items-center justify-between px-6 border-b">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Mail className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg">EsySync</span>
            </Link>
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <nav className="p-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/' && pathname.startsWith(item.href))
              
              return (
                <Tooltip key={item.name}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        isActive 
                          ? "bg-primary text-primary-foreground" 
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {item.description}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </nav>

          <div className="absolute bottom-4 left-4 right-4">
            <div className="p-4 rounded-lg bg-muted/50 text-sm">
              <p className="text-muted-foreground">
                Powered by{' '}
                <a 
                  href="https://resend.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-foreground hover:underline"
                >
                  Resend
                </a>
              </p>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="lg:pl-64">
          {/* Top bar */}
          <header className="sticky top-0 z-30 h-16 bg-background/95 backdrop-blur border-b flex items-center px-4 lg:px-6">
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden mr-2"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            
            <Breadcrumbs />
          </header>

          {/* Page content */}
          <main className="p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}

function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) {
    return <h1 className="text-lg font-semibold">Dashboard</h1>
  }

  const breadcrumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/')
    const label = getBreadcrumbLabel(segment)
    const isLast = index === segments.length - 1

    return { href, label, isLast }
  })

  return (
    <nav className="flex items-center gap-1 text-sm">
      <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
        Dashboard
      </Link>
      {breadcrumbs.map((crumb, index) => (
        <span key={index} className="flex items-center gap-1">
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          {crumb.isLast ? (
            <span className="font-medium">{crumb.label}</span>
          ) : (
            <Link 
              href={crumb.href} 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}

function getBreadcrumbLabel(segment: string): string {
  const labels: Record<string, string> = {
    leads: 'Leads',
    sequences: 'Sequenzen',
    settings: 'Einstellungen',
    new: 'Neu',
  }
  return labels[segment] || segment
}
