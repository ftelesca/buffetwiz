import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoginForm } from "./LoginForm"
import { SignUpForm } from "./SignUpForm"
import { ForgotPasswordForm } from "./ForgotPasswordForm"

export function AuthPage() {
  const [currentTab, setCurrentTab] = useState<"login" | "signup" | "forgot">("login")

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5 p-4">
      <div className="w-full max-w-md space-y-8">
        <img src="/logo.png" alt="BuffetWiz Logo" className="h-16 w-auto rounded-lg hover:opacity-80 transition-opacity" />
        <div className="text-center space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-gradient tracking-tight">
              BuffetWiz
            </h1>
            <p className="text-muted-foreground">
              Descomplicando seu Buffet
            </p>
          </div>
        </div>

        {/* Auth Forms */}
        <Card className="shadow-elegant border-0 glass-effect">
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

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>© 2025 BuffetWiz. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  )
}