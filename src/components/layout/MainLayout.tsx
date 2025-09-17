import { ReactNode } from "react"
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar"
import { ChevronRight, ChefHat } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppSidebar } from "./AppSidebar"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { UserMenu } from "@/components/auth/UserMenu"
import { WizardFloatingButton } from "@/components/wizard/WizardFloatingButton"

interface MainLayoutProps {
  children: ReactNode
}

function LayoutContent({ children }: MainLayoutProps) {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <div className="min-h-screen flex flex-col w-full bg-background">
      {/* Header - Full Width */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 glass-effect supports-[backdrop-filter]:bg-background/80 h-16">
        <div className="flex h-full items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="h-7 w-7" />
            <div className="flex items-center gap-3">
              <img src="/favicon.png" alt="BuffetWiz Logo" className="h-8 w-8 rounded" />
              <div>
                <h1 className="text-xl font-bold text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text">
                  BuffetWiz
                </h1>
                <p className="text-xs text-muted-foreground leading-tight hidden sm:block">
                  Gestão de Eventos Descomplicada
                </p>
              </div>
            </div>
          </div>
          <UserMenu />
        </div>
      </header>

      {/* Content Area with Sidebar */}
      <div className="flex flex-1 w-full">
        <AppSidebar />
        
        {/* Main Content */}
        <div className="flex-1 p-8 overflow-hidden bg-gradient-to-br from-background via-background to-accent/5">
          {children}
        </div>
      </div>
      
      {/* Wizard Floating Button */}
      <WizardFloatingButton />
    </div>
  )
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  )
}