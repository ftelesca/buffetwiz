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
  const { state } = useSidebar()
  const location = useLocation()
  const currentPath = location.pathname
  const isCollapsed = state === "collapsed"

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/"
    return currentPath.startsWith(path)
  }

  const getNavClassNames = (path: string) => {
    const baseClasses = "transition-all duration-300 hover:shadow-card"
    const activeClasses = isCollapsed 
      ? "bg-primary text-primary-foreground" 
      : "bg-primary/10 text-primary border-r-2 border-primary font-medium"
    const inactiveClasses = "text-muted-foreground hover:text-foreground hover:bg-accent/50"
    
    return `${baseClasses} ${isActive(path) ? activeClasses : inactiveClasses}`
  }

  const MenuButton = ({ item }: { item: typeof navigationItems[0] }) => {
    const button = (
      <SidebarMenuButton asChild>
        <NavLink
          to={item.url}
          className={`${getNavClassNames(item.url)} ${isCollapsed ? "w-12 h-12 rounded-lg flex items-center justify-center" : "flex items-center"}`}
        >
          <item.icon className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span className="ml-3">{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
    )

    if (isCollapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent side="right" className="ml-2">
            <p>{item.title}</p>
          </TooltipContent>
        </Tooltip>
      )
    }

    return button
  }

  return (
    <TooltipProvider>
      <Sidebar className={`${isCollapsed ? "w-16" : "w-64"} transition-all duration-300 ease-in-out`}>
        {/* Logo Area */}
        <div className={`border-b border-border transition-all duration-300 ${isCollapsed ? "p-3" : "p-4"} flex items-center ${isCollapsed ? "justify-center" : "justify-start"}`}>
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
            <div className="flex items-center gap-3 transition-all duration-300">
              <img src="/favicon.png" alt="BuffetWiz Logo" className="h-8 w-8 rounded" />
              <div className="overflow-hidden">
                <h1 className="text-xl font-bold text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text transition-all duration-300">
                  BuffetWiz
                </h1>
                <p className="text-xs text-muted-foreground transition-all duration-300">
                  Gestão de Eventos Descomplicada
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Content */}
        <SidebarContent className={`transition-all duration-300 ${isCollapsed ? "p-2" : "p-3"}`}>
          <SidebarGroup>
            {!isCollapsed && (
              <SidebarGroupLabel className="transition-all duration-300">
                Navegação
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className={`space-y-1 ${isCollapsed ? "flex flex-col items-center" : ""}`}>
                {navigationItems.map((item) => (
                  <SidebarMenuItem key={item.title} className={isCollapsed ? "w-full flex justify-center" : ""}>
                    <MenuButton item={item} />
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