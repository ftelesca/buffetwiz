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
      {/* Noise texture overlay */}
      <div className="fixed inset-0 pointer-events-none noise-overlay z-[60]" />
      
      {/* Animated gradient mesh background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[100px] animate-float" />
        <div className="absolute top-1/3 -left-20 w-[400px] h-[400px] bg-cyan/10 rounded-full blur-[80px] animate-float-delayed" />
        <div className="absolute -bottom-20 right-1/4 w-[350px] h-[350px] bg-purple/10 rounded-full blur-[90px] animate-pulse-glow" />
      </div>

      {/* Header - Full Width with Glassmorphism */}
      <header className="sticky top-0 z-50 w-full glass-card border-b border-border/30 h-20">
        <div className="flex h-full items-center justify-between pl-2 pr-8 pt-2 pb-2">
          <div className="flex items-center gap-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <a href="https://looli.com.br" target="_blank" rel="noopener noreferrer">
                  <img src="/logo.png" alt="BuffetWiz Logo" className="h-16 w-auto rounded-lg hover:opacity-80 transition-all hover:scale-105" />
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>Visite a Looli</p>
              </TooltipContent>
            </Tooltip>
          </div>
          
          <div className="flex-1 flex justify-center">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gradient-hero tracking-tight">
                BuffetWiz
              </h1>
              <p className="text-sm text-muted-foreground leading-tight hidden sm:block tracking-wide">
                Descomplicando seu Buffet
              </p>
            </div>
          </div>
          
          <UserMenu />
        </div>
      </header>

      {/* Content Area with Sidebar */}
      <div className="flex flex-1 w-full relative z-10">
        <AppSidebar />
        
        {/* Main Content */}
        <div className="flex-1 p-8 lg:p-12 overflow-hidden">
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
