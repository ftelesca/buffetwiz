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
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col transition-all duration-300 ease-in-out">
        {/* Desktop Header */}
        <header className="hidden md:block sticky top-0 z-40 border-b border-border/50 glass-effect supports-[backdrop-filter]:bg-background/80" style={{ height: 'var(--sidebar-logo-height, 4rem)' }}>
          <div className="flex h-full items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              {isCollapsed && (
                <div className="flex items-center gap-2">
                  <img src="/favicon.png" alt="BuffetWiz Logo" className="h-8 w-8 rounded" />
                  <div>
                    <h1 className="text-xl font-bold text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text">
                      BuffetWiz
                    </h1>
                  </div>
                </div>
              )}
            </div>
            <UserMenu />
          </div>
        </header>
        
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-40 border-b border-border/50 glass-effect supports-[backdrop-filter]:bg-background/80" style={{ height: 'var(--sidebar-logo-height, 4rem)' }}>
          <div className="flex h-full items-center px-6 gap-4 justify-between">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <img src="/favicon.png" alt="BuffetWiz Logo" className="h-8 w-8 rounded" />
              <div>
                <h1 className="text-xl font-bold text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text">
                  BuffetWiz
                </h1>
              </div>
            </div>
            <UserMenu />
          </div>
        </header>

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