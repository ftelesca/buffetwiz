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
  const { setOpenMobile, isMobile } = useSidebar()
  const location = useLocation()
  const currentPath = location.pathname
  const [isHovered, setIsHovered] = React.useState(false)

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/"
    return currentPath.startsWith(path)
  }

  const handleNavigate = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
    // Close hover state after navigation
    setIsHovered(false)
  }

  const getNavClassNames = (path: string) => {
    const baseClasses = "transition-all duration-300"
    const activeClasses = !isHovered
      ? "bg-primary text-primary-foreground rounded-lg"
      : "bg-primary/10 text-primary font-medium ring-1 ring-primary/40 rounded-lg"
    const inactiveClasses = "text-muted-foreground hover:text-foreground hover:bg-accent/50"
    
    return `${baseClasses} ${isActive(path) ? activeClasses : inactiveClasses}`
  }

  // Always show collapsed, expand only on hover
  const showExpanded = isHovered
  
  // Show tooltips only when not hovered
  const showTooltips = !isHovered

    return (
      <TooltipProvider>
        <Sidebar
          collapsible="icon"
          className={`transition-all duration-300 ease-in-out border-r ${isHovered ? 'w-52' : 'w-14'}`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
        {/* Navigation Content */}
        <SidebarContent className="transition-all duration-300 px-2 py-3">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {navigationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {showTooltips ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild>
                            <NavLink
                              to={item.url}
                              className={`${getNavClassNames(item.url)} flex items-center py-2 ${showExpanded ? 'px-2' : 'px-0 justify-center'}`}
                              onClick={handleNavigate}
                            >
                              <span className={`${showExpanded ? 'w-10' : 'w-full'} flex justify-center`}>
                                <item.icon className="h-5 w-5 flex-shrink-0" />
                              </span>
                              {showExpanded && <span className="ml-3 truncate">{item.title}</span>}
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
                          className={`${getNavClassNames(item.url)} flex items-center py-2 ${showExpanded ? 'px-2' : 'px-0 justify-center'}`}
                          onClick={handleNavigate}
                          data-sidebar="menu-button"
                        >
                          <span className={`${showExpanded ? 'w-10' : 'w-full'} flex justify-center`}>
                            <item.icon className="h-5 w-5 flex-shrink-0" />
                          </span>
                          {showExpanded && <span className="ml-3 truncate">{item.title}</span>}
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