import { useState } from "react"
import { NavLink, useLocation } from "react-router-dom"
import { 
  Calendar, 
  ChefHat, 
  Home, 
  Settings, 
  Users, 
  ShoppingCart,
  Menu as MenuIcon,
  ChefHat as LogoIcon,
  ChevronLeft
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

const navigationItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Eventos", url: "/eventos", icon: Calendar },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Receitas", url: "/cardapios", icon: ChefHat },
  { title: "Insumos", url: "/insumos", icon: ShoppingCart },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
]

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar()
  const location = useLocation()
  const currentPath = location.pathname

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/"
    return currentPath.startsWith(path)
  }

  const getNavClassNames = (path: string) => {
    return isActive(path) 
      ? "bg-primary/10 text-primary border-r-2 border-primary font-medium" 
      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
  }

  return (
    <Sidebar className={`${state === "collapsed" ? "w-16" : "w-64"} transition-all duration-300`}>
      <div className="border-b border-border p-4 flex items-center justify-between">
        {state !== "collapsed" ? (
          <>
            <div className="flex items-center gap-2">
              <div className="relative">
                <LogoIcon className="h-8 w-8 text-primary" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full border border-white shadow-sm" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text">
                  BuffetWiz
                </h1>
                <p className="text-xs text-muted-foreground">Gestão Gastronômica</p>
              </div>
            </div>
            <Button
              onClick={toggleSidebar}
              variant="ghost"
              className="absolute right-0 top-1/2 -translate-y-1/2 h-16 w-3 rounded-l-md bg-primary/20 hover:bg-primary/30 border-l border-t border-b border-primary/30 hover:border-primary/50 shadow-sm transition-all duration-200 flex items-center justify-center p-0"
            >
              <ChevronLeft className="h-4 w-4 text-primary" />
            </Button>
          </>
        ) : (
          <div className="relative">
            <LogoIcon className="h-8 w-8 text-primary" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full border border-white shadow-sm" />
          </div>
        )}
      </div>

      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupLabel>
            {state !== "collapsed" ? "Navegação" : ""}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={`${getNavClassNames(item.url)} transition-all duration-200 hover:shadow-card`}
                    >
                      <item.icon className="h-5 w-5" />
                      {state !== "collapsed" && (
                        <span className="ml-3">{item.title}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}