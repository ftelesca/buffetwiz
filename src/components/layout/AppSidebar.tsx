import React from "react"
import { NavLink, useLocation } from "react-router-dom"
import { Calendar, ChefHat, Home, Users, ShoppingCart } from "lucide-react"
import { useSidebar } from "@/components/ui/sidebar"

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

  // Stable mini rail + unified hover area (one clickable container for icon+caption)
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
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    // small delay to avoid flicker when moving between rail and overlay
    closeTimer.current = window.setTimeout(() => setHovered(false), 120)
  }

  React.useEffect(() => () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
  }, [])

  const handleNavigate = () => {
    if (isMobile) setOpenMobile(false)
    setHovered(false)
  }

  // Collapsed icon button (equal left/right padding, stable size)
  const collapsedBtnCls = (path: string) => {
    const base = "group w-full h-11 px-2 flex items-center rounded-xl transition-colors"
    if (hovered) return `${base} text-muted-foreground`
    const active = "text-primary bg-primary/12 ring-1 ring-primary/40 shadow-sm"
    const inactive = "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
    return `${base} ${isActive(path) ? active : inactive}`
  }

  // Overlay link that covers both icon area (rail) and caption area
  const overlayBtnCls = (path: string) => {
    const base = "h-11 flex items-center rounded-xl pr-3 transition-colors select-none"
    const active = "bg-primary/12 text-primary ring-1 ring-primary/40 shadow-sm"
    const inactive = "text-foreground/80 hover:bg-accent/70"
    return `${base} ${isActive(path) ? active : inactive}`
  }

  return (
    <div className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {/* Mini rail - fixed width, icons centered with equal padding */}
      <aside className="w-16 border-r border-border/60 sticky top-20 h-[calc(100vh-5rem)] bg-sidebar/35 backdrop-blur-sm">
        <nav className="pt-4 pb-4 px-2">
          <ul className="space-y-1">
            {navigationItems.map((item) => (
              <li key={item.title}>
                <NavLink
                  to={item.url}
                  className={`${collapsedBtnCls(item.url)} ${hovered ? "pointer-events-none" : ""}`}
                  onClick={handleNavigate}
                  end={item.url === "/"}
                >
                  <span className="h-10 w-10 flex items-center justify-center">
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Hover overlay - extends from rail with background and border */}
      {hovered && !isMobile && (
        <div className="fixed top-20 bottom-0 left-0 z-50" onMouseEnter={onEnter} onMouseLeave={onLeave}>
          <div className="inline-block h-full">
            <div className="h-full border-r pl-0 pr-2 pt-3 pb-4 whitespace-nowrap text-foreground bg-background">
              <nav className="flex flex-col gap-1 px-2">
                {navigationItems.map((item) => (
                  <NavLink
                    key={item.title}
                    to={item.url}
                    end={item.url === "/"}
                    className={overlayBtnCls(item.url)}
                    onClick={handleNavigate}
                  >
                    <span className="h-10 w-10 flex items-center justify-center">
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                    </span>
                    <span className="text-sm font-medium">{item.title}</span>
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
