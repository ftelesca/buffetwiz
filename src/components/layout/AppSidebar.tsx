import React from "react"
import { NavLink, useLocation } from "react-router-dom"
import { 
  Calendar, 
  ChefHat, 
  Home, 
  Users, 
  ShoppingCart
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

const navigationItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Eventos", url: "/eventos", icon: Calendar },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Produtos", url: "/cardapios", icon: ChefHat },
  { title: "Insumos", url: "/insumos", icon: ShoppingCart },
]

export function AppSidebar() {
  const { setOpenMobile, isMobile } = useSidebar()
  const location = useLocation()
  const currentPath = location.pathname

  // Keep icons perfectly stable: sidebar stays mini, overlay floats over main.
  const [hovered, setHovered] = React.useState(false)
  const closeTimer = React.useRef<number | null>(null)

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/"
    return currentPath.startsWith(path)
  }

  const onEnter = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    setHovered(true)
  }

  const onLeave = () => {
    // small delay to avoid blink when moving from rail to overlay
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setHovered(false), 120)
  }

  React.useEffect(() => () => { if (closeTimer.current) window.clearTimeout(closeTimer.current) }, [])

  const handleNavigate = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
    setHovered(false)
  }

  const collapsedBtnCls = (path: string) => {
    const base = "group w-full h-10 px-2 flex items-center justify-center rounded-md transition-colors"
    const active = "text-primary bg-primary/10 ring-1 ring-primary/40"
    const inactive = "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
    return `${base} ${isActive(path) ? active : inactive}`
  }

  const overlayBtnCls = (path: string) => {
    const base = "w-full flex items-center px-3 py-2 rounded-md transition-colors"
    const active = "bg-primary/10 text-primary ring-1 ring-primary/40"
    const inactive = "text-foreground/80 hover:bg-accent/50"
    return `${base} ${isActive(path) ? active : inactive}`
  }

  return (
    <div className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {/* Mini rail - fixed width, icons centered with equal padding */}
      <Sidebar collapsible="none" className="w-14 border-r">
        <SidebarContent className="px-2 pt-4 pb-4">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {navigationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={collapsedBtnCls(item.url)}
                        onClick={handleNavigate}
                        end={item.url === "/"}
                      >
                        <span className="h-10 w-10 flex items-center justify-center">
                          <item.icon className="h-5 w-5 flex-shrink-0" />
                        </span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      {/* Hover overlay - floats over main panel, auto width (widest caption + padding) */}
      {hovered && !isMobile && (
        <div className="absolute inset-y-0 left-14 z-50" onMouseEnter={onEnter} onMouseLeave={onLeave}>
          <div className="inline-block h-full">
            <div className="h-full bg-popover text-popover-foreground border-r shadow-lg px-3 py-4 whitespace-nowrap">
              <nav className="flex flex-col gap-1">
                {navigationItems.map((item) => (
                  <NavLink
                    key={item.title}
                    to={item.url}
                    end={item.url === "/"}
                    className={overlayBtnCls(item.url)}
                    onClick={handleNavigate}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="ml-3">{item.title}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
