import React from "react"
import { NavLink, useLocation } from "react-router-dom"
import { Calendar, ChefHat, Home, Users, ShoppingCart, Pin, PinOff } from "lucide-react"
import { useSidebar } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

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
  const pinStorageKey = "buffetwiz-sidebar-pinned"

  // Single-rail behavior (Instagram-like): width expands, icon anchor stays fixed.
  const [hovered, setHovered] = React.useState(false)
  const [pinned, setPinned] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem("buffetwiz-sidebar-pinned") === "1"
  })
  const closeTimer = React.useRef<number | null>(null)
  const expanded = (hovered || pinned) && !isMobile

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
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    // small delay to avoid flicker when moving between rail and overlay
    closeTimer.current = window.setTimeout(() => setHovered(false), 120)
  }

  React.useEffect(() => () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
  }, [])

  React.useEffect(() => {
    localStorage.setItem(pinStorageKey, pinned ? "1" : "0")
  }, [pinStorageKey, pinned])

  const handleNavigate = () => {
    if (isMobile) setOpenMobile(false)
    if (!pinned) setHovered(false)
  }

  const handleTogglePin = () => {
    setPinned((prev) => !prev)
  }

  const itemCls = (path: string) => {
    const base = "group w-full h-11 px-0 flex items-center justify-start rounded-xl transition-colors overflow-hidden"
    const active = "text-primary bg-primary/12 ring-1 ring-primary/40 shadow-sm"
    const inactive = "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
    return `${base} ${isActive(path) ? active : inactive}`
  }

  return (
    <div className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <aside
        className={`sticky top-20 h-[calc(100vh-5rem)] border-r border-border/60 bg-sidebar/35 backdrop-blur-sm overflow-hidden transition-[width] duration-200 ease-out ${expanded ? "w-56" : "w-16"}`}
      >
        <nav className="pt-4 pb-4 px-2">
          <div className={`mb-3 flex ${expanded ? "justify-end pr-1" : "justify-center"}`}>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleTogglePin}
              title={pinned ? "Desafixar barra lateral" : "Fixar barra lateral"}
              aria-label={pinned ? "Desafixar barra lateral" : "Fixar barra lateral"}
            >
              {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </Button>
          </div>
          <ul className="space-y-1">
            {navigationItems.map((item) => (
              <li key={item.title}>
                <NavLink
                  to={item.url}
                  className={itemCls(item.url)}
                  onClick={handleNavigate}
                  end={item.url === "/"}
                >
                  <span className="ml-1 h-10 w-10 flex-shrink-0 flex items-center justify-center">
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                  </span>
                  <span
                    className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-200 ${
                      expanded
                        ? "ml-1 max-w-[11rem] opacity-100 translate-x-0"
                        : "ml-0 max-w-0 opacity-0 -translate-x-2 pointer-events-none"
                    }`}
                  >
                    {item.title}
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </div>
  )
}
