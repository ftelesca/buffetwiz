import { useState, useEffect } from "react"
import { useTheme } from "@/contexts/ThemeContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface WindowInfo {
  isIframe: boolean
  userAgent: string
  viewport: { width: number; height: number }
  devicePixelRatio: number
  colorScheme: string
  environment: string
}

interface CacheInfo {
  serviceWorkerRegistered: boolean
  localStorageKeys: string[]
  sessionStorageKeys: string[]
  resourceTimings: PerformanceResourceTiming[]
  cacheControlHeaders: { [url: string]: string }
}

interface CSSVariables {
  [key: string]: string
}

export function WindowDiagnostics() {
  const [isVisible, setIsVisible] = useState(false)
  const [windowInfo, setWindowInfo] = useState<WindowInfo | null>(null)
  const [cssVars, setCssVars] = useState<CSSVariables>({})
  const [fontStatus, setFontStatus] = useState<{ [key: string]: boolean }>({})
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null)
  const { theme } = useTheme()

  useEffect(() => {
    const detectEnvironment = () => {
      const isIframe = window !== window.top
      const info: WindowInfo = {
        isIframe,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        devicePixelRatio: window.devicePixelRatio,
        colorScheme: window.getComputedStyle(document.documentElement).getPropertyValue('color-scheme'),
        environment: isIframe ? 'Preview (iframe)' : 'Detached Window'
      }
      setWindowInfo(info)
      console.log('Window Environment:', info)
    }

    const getCSSVariables = () => {
      const root = document.documentElement
      const computedStyle = getComputedStyle(root)
      const vars: CSSVariables = {}
      
      // Key CSS variables to check
      const importantVars = [
        '--background', '--foreground', '--primary', '--secondary',
        '--accent', '--muted', '--border', '--ring', '--gradient-primary',
        '--shadow-elegant', '--transition-smooth'
      ]
      
      importantVars.forEach(varName => {
        vars[varName] = computedStyle.getPropertyValue(varName).trim()
      })
      
      setCssVars(vars)
      console.log('CSS Variables:', vars)
    }

    const checkFonts = async () => {
      if (!document.fonts) return
      
      const fontChecks: { [key: string]: boolean } = {}
      const fontsToCheck = ['Inter', 'system-ui', 'Geist Sans']
      
      for (const font of fontsToCheck) {
        try {
          const loaded = await document.fonts.check(`16px ${font}`)
          fontChecks[font] = loaded
        } catch (e) {
          fontChecks[font] = false
        }
      }
      
      setFontStatus(fontChecks)
      console.log('Font Status:', fontChecks)
    }

    const analyzeCacheInfo = async () => {
      try {
        // Check service worker registration
        const serviceWorkerRegistered = 'serviceWorker' in navigator && 
          (await navigator.serviceWorker.getRegistrations()).length > 0

        // Get storage keys
        const localStorageKeys = Object.keys(localStorage)
        const sessionStorageKeys = Object.keys(sessionStorage)

        // Get resource timing data
        const resourceTimings = performance.getEntriesByType('resource') as PerformanceResourceTiming[]

        // Analyze cache headers from network requests
        const cacheControlHeaders: { [url: string]: string } = {}
        resourceTimings.forEach(timing => {
          if (timing.name.includes('.css') || timing.name.includes('.js') || timing.name.includes('fonts')) {
            cacheControlHeaders[timing.name] = `Transfer: ${timing.transferSize}, Duration: ${timing.duration.toFixed(2)}ms`
          }
        })

        const info: CacheInfo = {
          serviceWorkerRegistered,
          localStorageKeys,
          sessionStorageKeys,
          resourceTimings: resourceTimings.slice(0, 10), // Limit to first 10
          cacheControlHeaders
        }

        setCacheInfo(info)
        console.log('Cache Info:', info)
      } catch (error) {
        console.error('Error analyzing cache info:', error)
      }
    }

    detectEnvironment()
    getCSSVariables()
    checkFonts()
    analyzeCacheInfo()

    const handleResize = () => {
      setWindowInfo(prev => prev ? {
        ...prev,
        viewport: { width: window.innerWidth, height: window.innerHeight }
      } : null)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [theme])

  const forceRefreshResources = () => {
    // Clear browser cache for this session
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name))
      })
    }
    
    // Force reload stylesheets
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"]')
    stylesheets.forEach(link => {
      const href = (link as HTMLLinkElement).href
      ;(link as HTMLLinkElement).href = href + (href.includes('?') ? '&' : '?') + 'cache_bust=' + Date.now()
    })
    
    console.log('Forced refresh of cached resources')
  }

  if (!isVisible) {
    return (
      <Button
        onClick={() => setIsVisible(true)}
        variant="outline"
        size="sm"
        className="fixed bottom-4 left-4 z-50 opacity-50 hover:opacity-100"
      >
        Debug
      </Button>
    )
  }

  return (
    <div className="fixed inset-4 z-50 overflow-auto bg-background/95 backdrop-blur-sm border border-border rounded-lg">
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Window Diagnostics</h2>
          <Button onClick={() => setIsVisible(false)} variant="outline" size="sm">
            Close
          </Button>
        </div>

        {windowInfo && (
          <Card>
            <CardHeader>
              <CardTitle>Environment Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                <Badge variant={windowInfo.isIframe ? "destructive" : "default"}>
                  {windowInfo.environment}
                </Badge>
                <Badge variant="outline">Theme: {theme}</Badge>
              </div>
              <div className="text-sm space-y-1">
                <p><strong>Viewport:</strong> {windowInfo.viewport.width} × {windowInfo.viewport.height}</p>
                <p><strong>Device Pixel Ratio:</strong> {windowInfo.devicePixelRatio}</p>
                <p><strong>Color Scheme:</strong> {windowInfo.colorScheme || 'none'}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>CSS Variables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm font-mono">
              {Object.entries(cssVars).map(([key, value]) => (
                <div key={key} className="flex justify-between border-b border-border/30 pb-1">
                  <span className="text-muted-foreground">{key}:</span>
                  <span className="text-foreground">{value || 'undefined'}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Font Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(fontStatus).map(([font, loaded]) => (
                <Badge key={font} variant={loaded ? "default" : "destructive"}>
                  {font}: {loaded ? 'Loaded' : 'Not Loaded'}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {cacheInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                Cache Analysis
                <Button onClick={forceRefreshResources} variant="outline" size="sm">
                  Force Refresh
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Environment</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Service Worker:</span>
                      <Badge variant={cacheInfo.serviceWorkerRegistered ? "default" : "outline"}>
                        {cacheInfo.serviceWorkerRegistered ? 'Active' : 'None'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>LocalStorage keys:</span>
                      <span>{cacheInfo.localStorageKeys.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SessionStorage keys:</span>
                      <span>{cacheInfo.sessionStorageKeys.length}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Resource Timing</h4>
                  <div className="text-sm space-y-1 max-h-32 overflow-y-auto">
                    {Object.entries(cacheInfo.cacheControlHeaders).map(([url, info]) => (
                      <div key={url} className="border-b border-border/30 pb-1">
                        <div className="font-mono text-xs truncate">{url.split('/').pop()}</div>
                        <div className="text-muted-foreground text-xs">{info}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {cacheInfo.localStorageKeys.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Storage Contents</h4>
                  <div className="text-sm space-y-1 max-h-32 overflow-y-auto">
                    {cacheInfo.localStorageKeys.map(key => (
                      <div key={key} className="flex justify-between border-b border-border/30 pb-1">
                        <span className="font-mono text-xs">{key}</span>
                        <span className="text-muted-foreground text-xs truncate max-w-32">
                          {localStorage.getItem(key)?.slice(0, 20)}...
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Visual Test Elements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-primary/10 border border-primary/20 rounded">
              <p className="text-primary font-medium">Primary color test</p>
            </div>
            <div className="p-4 gradient-primary rounded text-white">
              <p>Gradient test</p>
            </div>
            <div className="p-4 shadow-elegant rounded bg-card">
              <p>Shadow test</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}