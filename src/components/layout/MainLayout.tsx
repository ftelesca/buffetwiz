import { ReactNode } from "react"
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar"
import { ChevronRight, ChefHat } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppSidebar } from "./AppSidebar"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { UserMenu } from "@/components/auth/UserMenu"

interface MainLayoutProps {
  children: ReactNode
}

function LayoutContent({ children }: MainLayoutProps) {
  const { state, toggleSidebar } = useSidebar()

  return (
    <div className="min-h-screen flex w-full bg-background relative">
      <AppSidebar />
      
      {/* Floating trigger when collapsed */}
      {state === "collapsed" && (
        <Button
          onClick={toggleSidebar}
          variant="ghost"
          className="fixed left-0 top-1/2 -translate-y-1/2 z-50 h-16 w-3 rounded-r-md bg-primary/20 hover:bg-primary/30 border-r border-t border-b border-primary/30 hover:border-primary/50 shadow-sm transition-all duration-200 flex items-center justify-center p-0"
        >
          <ChevronRight className="h-4 w-4 text-primary" />
        </Button>
      )}
      
      <main className="flex-1 flex flex-col">
        {/* Desktop header - only when sidebar is collapsed */}
        {state === "collapsed" && (
          <header className="hidden md:block sticky top-0 z-40 h-16 border-b border-border/50 glass-effect supports-[backdrop-filter]:bg-background/80">
            <div className="flex h-full items-center px-6 gap-4 justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <img src="/favicon.png" alt="BuffetWiz Logo" className="h-8 w-8 rounded" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full border border-white shadow-sm" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text">
                    BuffetWiz
                  </h1>
                  <p className="text-xs text-muted-foreground">Gestão Gastronômica</p>
                </div>
              </div>
              <UserMenu />
            </div>
          </header>
        )}
        
        {/* Desktop header - when sidebar is expanded */}
        {state === "expanded" && (
          <header className="hidden md:block sticky top-0 z-40 h-16 border-b border-border/50 glass-effect supports-[backdrop-filter]:bg-background/80">
            <div className="flex h-full items-center justify-end px-6">
              <UserMenu />
            </div>
          </header>
        )}
        
        {/* Mobile-only header - always visible on mobile */}
        <header className="md:hidden sticky top-0 z-40 h-16 border-b border-border/50 glass-effect supports-[backdrop-filter]:bg-background/80">
          <div className="flex h-full items-center px-6 gap-4 justify-between">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <div className="relative">
                <img src="/favicon.png" alt="BuffetWiz Logo" className="h-8 w-8 rounded" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full border border-white shadow-sm" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text">
                  BuffetWiz
                </h1>
                <p className="text-xs text-muted-foreground">Gestão Gastronômica</p>
              </div>
            </div>
            <UserMenu />
          </div>
        </header>
        <div className="flex-1 p-8 overflow-hidden bg-gradient-to-br from-background via-background to-accent/5">
          {children}
        </div>
      </main>
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