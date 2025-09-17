import { ReactNode } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "./AppSidebar"
import { UserMenu } from "@/components/auth/UserMenu"
import { WizardFloatingButton } from "@/components/wizard/WizardFloatingButton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface MainLayoutProps {
  children: ReactNode
}

function LayoutContent({ children }: MainLayoutProps) {

  return (
    <div className="min-h-screen flex flex-col w-full bg-background">
      {/* Header - Full Width */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 glass-effect supports-[backdrop-filter]:bg-background/80 h-20">
        <div className="flex h-full items-center justify-between pl-2 pr-8 pt-2 pb-2">
          <div className="flex items-center gap-6 flex-1 max-w-md">
            <Tooltip>
              <TooltipTrigger asChild>
                <a href="https://looli.com.br" target="_blank" rel="noopener noreferrer">
                  <img src="/logo.png" alt="BuffetWiz Logo" className="h-16 w-auto rounded-lg hover:opacity-80 transition-opacity" />
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>Visite a Looli</p>
              </TooltipContent>
            </Tooltip>
            <div>
              <h1 className="text-2xl font-bold text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text">
                BuffetWiz
              </h1>
              <p className="text-sm text-muted-foreground leading-tight hidden sm:block">
                Descomplicando seu Buffet
              </p>
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
    <TooltipProvider>
      <SidebarProvider defaultOpen={false}>
        <LayoutContent>{children}</LayoutContent>
      </SidebarProvider>
    </TooltipProvider>
  )
}