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

  // Stable mini rail + hover overlay for captions only
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

  const collapsedBtnCls = (path: string) => {
    const base = "group w-full h-10 px-2 flex items-center justify-center rounded-md transition-colors"
    const active = "text-primary bg-primary/10 ring-1 ring-primary/40"
    const inactive = "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
    return `${base} ${isActive(path) ? active : inactive}`
  }

  const overlayTextCls = (path: string) => {
    const base = "h-10 flex items-center rounded-md px-3 transition-colors"
    const active = "bg-primary/10 text-primary ring-1 ring-primary/40"
    const inactive = "text-foreground/80 hover:bg-accent/50"
    return `${base} ${isActive(path) ? active : inactive}`
  }

  return (
    <div className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {/* Mini rail - fixed width, stable icons with equal padding */}
      <aside className="w-14 border-r">
        <nav className="pt-3 pb-4 px-2">
          <ul className="space-y-1">
            {navigationItems.map((item) => (
              <li key={item.title}>
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
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Hover overlay - extends to the right to show captions ONLY (no duplicate icons) */}
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
                    className={overlayTextCls(item.url)}
                    onClick={handleNavigate}
                  >
                    <span>{item.title}</span>
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
