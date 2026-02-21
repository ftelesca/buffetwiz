import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoginForm } from "./LoginForm"
import { SignUpForm } from "./SignUpForm"
import { ForgotPasswordForm } from "./ForgotPasswordForm"

export function AuthPage() {
  const [currentTab, setCurrentTab] = useState<"login" | "signup" | "forgot">("login")

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_12%_18%,hsl(var(--primary)/0.2),transparent_30%),radial-gradient(circle_at_88%_12%,hsl(var(--success)/0.22),transparent_34%),linear-gradient(155deg,hsl(var(--background))_0%,hsl(var(--accent)/0.6)_100%)] p-4 md:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl grid-cols-1 overflow-hidden rounded-3xl border border-border/60 bg-card/70 shadow-elegant backdrop-blur-xl lg:grid-cols-2">
        <div className="relative hidden overflow-hidden p-10 lg:flex lg:flex-col lg:justify-between bg-[radial-gradient(circle_at_10%_8%,hsl(var(--background)/0.3),transparent_40%),linear-gradient(145deg,hsl(var(--primary))_0%,hsl(var(--primary-glow))_48%,hsl(var(--success))_100%)] text-primary-foreground">
          <div>
            <a
              href="https://looli.com.br"
              target="_blank"
              rel="noopener noreferrer"
              title="Visite a Looli"
              className="inline-flex items-center gap-3 rounded-xl border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-2 text-sm font-medium backdrop-blur-sm"
            >
              <img src="/logo.png" alt="BuffetWiz Logo" className="h-8 w-auto rounded-md" />
              Powered by Looli
            </a>
          </div>
          <div className="space-y-5">
            <p className="text-xs uppercase tracking-[0.18em] text-primary-foreground/80">Plataforma de gestão</p>
            <h1 className="text-5xl font-semibold leading-tight tracking-tight">
              BuffetWiz
            </h1>
            <p className="max-w-md text-base text-primary-foreground/90">
              Organize eventos, controle custos e aumente sua margem com uma operação mais inteligente.
            </p>
          </div>
          <div className="rounded-2xl border border-primary-foreground/25 bg-primary-foreground/10 p-4 backdrop-blur-sm">
            <p className="text-sm text-primary-foreground/90">
              "Planejamento de eventos em minutos, não em planilhas intermináveis."
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center p-4 sm:p-8 lg:p-10">
          <div className="w-full max-w-md space-y-6">
            <div className="lg:hidden flex items-center justify-between space-x-4">
              <div className="text-left">
                <h1 className="text-3xl font-bold text-gradient tracking-tight">
                  BuffetWiz
                </h1>
                <p className="text-muted-foreground">
                  Descomplicando seu Buffet
                </p>
              </div>
              <a
                href="https://looli.com.br"
                target="_blank"
                rel="noopener noreferrer"
                title="Visite a Looli"
                className="inline-block"
              >
                <img
                  src="/logo.png"
                  alt="BuffetWiz Logo"
                  className="h-14 w-auto rounded-lg hover:opacity-80 transition-opacity"
                />
              </a>
            </div>

            <Card className="border-border/60 bg-card/88 shadow-card">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl">
                  {currentTab === "login" && "Entrar na sua conta"}
                  {currentTab === "signup" && "Criar nova conta"}
                  {currentTab === "forgot" && "Recuperar senha"}
                </CardTitle>
                <CardDescription>
                  {currentTab === "login" && "Acesse sua plataforma"}
                  {currentTab === "signup" && "Comece a organizar seus eventos hoje"}
                  {currentTab === "forgot" && "Enviaremos um link para redefinir sua senha"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentTab === "login" && (
                  <LoginForm
                    onSwitchToSignUp={() => setCurrentTab("signup")}
                    onSwitchToForgot={() => setCurrentTab("forgot")}
                  />
                )}
                {currentTab === "signup" && (
                  <SignUpForm
                    onSwitchToLogin={() => setCurrentTab("login")}
                  />
                )}
                {currentTab === "forgot" && (
                  <ForgotPasswordForm
                    onSwitchToLogin={() => setCurrentTab("login")}
                  />
                )}
              </CardContent>
            </Card>

            <div className="text-center text-sm text-muted-foreground">
              <p>© 2026 BuffetWiz. Todos os direitos reservados.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
