import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { useTheme } from "@/contexts/ThemeContext"
import { Moon, Sun } from "lucide-react"

export default function Preferences() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="page-fade-in max-w-4xl space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Preferências</h2>
        <p className="text-muted-foreground">
          Gerencie as preferências e configurações do sistema
        </p>
      </div>

      <div className="space-y-6">
        <Card className="shadow-card hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              Aparência
            </CardTitle>
            <CardDescription>
              Personalize a aparência da interface do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="theme-toggle" className="text-sm font-medium">
                  Modo Escuro
                </Label>
                <p className="text-xs text-muted-foreground">
                  Ative o modo escuro para uma experiência mais confortável em ambientes com pouca luz
                </p>
              </div>
              <Switch
                id="theme-toggle"
                checked={theme === "dark"}
                onCheckedChange={toggleTheme}
                className="ml-4"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card hover-lift">
          <CardHeader>
            <CardTitle>Sistema</CardTitle>
            <CardDescription>
              Configurações gerais do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>Versão: 1.0.0</p>
              <p>Ambiente: Produção</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}