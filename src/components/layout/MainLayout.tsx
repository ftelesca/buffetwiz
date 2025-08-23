import { ReactNode } from "react"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "./AppSidebar"

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="sticky top-0 z-50 h-14 border-b border-border bg-background backdrop-blur-sm supports-[backdrop-filter]:bg-background/95">
            <div className="flex h-full items-center px-4 gap-4 justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="shrink-0" />
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold text-foreground">BuffetWiz</h1>
                </div>
              </div>
            </div>
          </header>
          <div className="flex-1 p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}