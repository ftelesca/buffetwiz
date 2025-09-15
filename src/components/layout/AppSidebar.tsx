import { NavLink, useLocation } from "react-router-dom"
import { 
  Calendar, 
  ChefHat, 
  Home, 
  Users, 
  ShoppingCart,
  ChefHat as LogoIcon
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const navigationItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Eventos", url: "/eventos", icon: Calendar },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Produtos", url: "/cardapios", icon: ChefHat },
  { title: "Insumos", url: "/insumos", icon: ShoppingCart },
]

export function AppSidebar() {
  const { state, setOpen, setOpenMobile, isMobile } = useSidebar()
  const location = useLocation()
  const currentPath = location.pathname
  const isCollapsed = state === "collapsed"

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/"
    return currentPath.startsWith(path)
  }

  const handleNavigate = () => {
    if (isMobile) {
      setOpenMobile(false)
    } else {
      setOpen(false)
    }
  }

  const getNavClassNames = (path: string) => {
    const baseClasses = "transition-all duration-300"
    const activeClasses = isCollapsed 
      ? "bg-primary text-primary-foreground rounded-lg" 
      : "bg-primary/10 text-primary border-r-2 border-primary font-medium"
    const inactiveClasses = "text-muted-foreground hover:text-foreground hover:bg-accent/50"
    
    return `${baseClasses} ${isActive(path) ? activeClasses : inactiveClasses}`
  }

    return (
      <TooltipProvider>
        <Sidebar collapsible="icon" className="transition-all duration-300 ease-in-out">
          {/* Logo Area */}
          <div 
            ref={(el) => {
              if (el && !isCollapsed) {
                const height = el.getBoundingClientRect().height
                document.documentElement.style.setProperty('--sidebar-logo-height', `${height}px`)
              }
            }}
            className={`border-b border-border transition-all duration-300 ${isCollapsed ? "p-3" : "p-4"} flex items-center ${isCollapsed ? "justify-center" : "justify-start"}`}
          >
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center">
                    <img src="/favicon.png" alt="BuffetWiz Logo" className="h-8 w-8 rounded transition-all duration-300" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="ml-2">
                  <p>BuffetWiz</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex items-center gap-3 transition-all duration-300 min-w-0" data-sidebar="brand">
                <img src="/favicon.png" alt="BuffetWiz Logo" className="h-8 w-8 rounded flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-bold text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text transition-all duration-300 truncate">
                    BuffetWiz
                  </h1>
                  <p className="text-xs text-muted-foreground transition-all duration-300 whitespace-normal leading-tight">
                    Gestão de Eventos Descomplicada
                  </p>
                </div>
              </div>
            )}
          </div>

        {/* Navigation Content */}
        <SidebarContent className={`transition-all duration-300 ${isCollapsed ? "px-0 py-2" : "p-3"}`}>
          <SidebarGroup>
            {!isCollapsed && (
              <SidebarGroupLabel className="transition-all duration-300" data-sidebar="group-label">
                Navegação
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {navigationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {isCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild>
                            <NavLink
                              to={item.url}
                              className={`${getNavClassNames(item.url)} flex items-center justify-center`}
                              onClick={handleNavigate}
                            >
                              <item.icon className="h-5 w-5" />
                            </NavLink>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="ml-2">
                          <p>{item.title}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          className={`${getNavClassNames(item.url)} flex items-center px-3 py-2`}
                          onClick={handleNavigate}
                          data-sidebar="menu-button"
                        >
                          <item.icon className="h-5 w-5 flex-shrink-0" />
                          <span className="ml-3 truncate">{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </TooltipProvider>
  )
}