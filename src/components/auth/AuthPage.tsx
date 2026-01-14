import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoginForm } from "./LoginForm"
import { SignUpForm } from "./SignUpForm"
import { ForgotPasswordForm } from "./ForgotPasswordForm"

export function AuthPage() {
  const [currentTab, setCurrentTab] = useState<"login" | "signup" | "forgot">("login")

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
      {/* Animated gradient mesh background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] animate-float" />
        <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] bg-cyan/15 rounded-full blur-[100px] animate-float-delayed" />
        <div className="absolute -bottom-40 right-1/3 w-[450px] h-[450px] bg-purple/15 rounded-full blur-[110px] animate-pulse-glow" />
      </div>
      
      {/* Noise texture overlay */}
      <div className="fixed inset-0 pointer-events-none noise-overlay z-10" />

      <div className="w-full max-w-md space-y-8 relative z-20">
        {/* Header */}
        <div className="flex items-center justify-between space-x-4">
          <div className="text-left">
            <h1 className="text-4xl font-bold text-gradient-hero tracking-tight">
              BuffetWiz
            </h1>
            <p className="text-muted-foreground tracking-wide">
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
              className="h-16 w-auto rounded-lg hover:opacity-80 transition-all hover:scale-105" 
            />
          </a>
        </div>

        {/* Auth Forms Card */}
        <Card variant="glass" className="glow-border shadow-elegant">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold">
              {currentTab === "login" && "Entrar na sua conta"}
              {currentTab === "signup" && "Criar nova conta"}
              {currentTab === "forgot" && "Recuperar senha"}
            </CardTitle>
            <CardDescription className="text-base">
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

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>© 2025 BuffetWiz. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  )
}
