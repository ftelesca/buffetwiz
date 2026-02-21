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
    <div className="min-h-screen flex flex-col w-full bg-background relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,hsl(var(--primary)/0.16),transparent_40%),radial-gradient(circle_at_85%_5%,hsl(var(--success)/0.14),transparent_36%)]" />
      {/* Header - Full Width */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/85 backdrop-blur-xl h-20">
        <div className="relative mx-auto flex h-full w-full max-w-[1800px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <a href="https://looli.com.br" target="_blank" rel="noopener noreferrer">
                  <img src="/logo.png" alt="BuffetWiz Logo" className="h-14 w-auto rounded-xl hover:opacity-80 transition-opacity" />
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>Visite a Looli</p>
              </TooltipContent>
            </Tooltip>
          </div>
          
          <div className="flex-1 flex justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-transparent bg-gradient-to-r from-primary via-primary to-success bg-clip-text">
                BuffetWiz
              </h1>
              <p className="text-xs text-muted-foreground leading-tight hidden sm:block uppercase tracking-[0.14em]">
                Descomplicando seu Buffet
              </p>
            </div>
          </div>
          
          <UserMenu />
        </div>
      </header>

      {/* Content Area with Sidebar */}
      <div className="relative flex flex-1 w-full">
        <AppSidebar />
        
        {/* Main Content */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-hidden">
          <div className="mx-auto h-full max-w-[1700px] rounded-2xl border border-border/55 bg-card/72 backdrop-blur-md shadow-card overflow-hidden">
            <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
              {children}
            </div>
          </div>
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
