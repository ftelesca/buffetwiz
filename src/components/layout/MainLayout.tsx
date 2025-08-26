import { ReactNode } from "react"
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { ChevronRight, UtensilsCrossed } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppSidebar } from "./AppSidebar"

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
          variant="outline"
          size="icon"
          className="fixed left-2 top-20 z-50 h-8 w-8 rounded-full shadow-md border-border bg-background hover:bg-accent"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
      
      <main className="flex-1 flex flex-col">
        <header className="sticky top-0 z-40 h-16 border-b border-border/50 glass-effect supports-[backdrop-filter]:bg-background/80">
          <div className="flex h-full items-center px-6 gap-4 justify-between">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text">
                  BuffetWiz
                </h1>
                <p className="text-xs text-muted-foreground">Gestão Gastronômica</p>
              </div>
            </div>
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