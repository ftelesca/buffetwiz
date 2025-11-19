import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react"
import { GoogleIcon } from "./GoogleIcon"

interface LoginFormProps {
  onSwitchToSignUp: () => void
  onSwitchToForgot: () => void
}

export function LoginForm({ onSwitchToSignUp, onSwitchToForgot }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  
  const { signIn, signInWithGoogle } = useAuth()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signIn(email, password);
      // On success, AuthContext navigates to /dashboard
    } catch (error: any) {
      toast({
        title: "Erro ao entrar",
        description: error.message || "Erro ao fazer login",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    
    try {
      await signInWithGoogle();  // From AuthContext
    } catch (error: any) {
      toast({
        title: "Erro no login",
        description: error.message || "Erro ao fazer login com Google",
        variant: "destructive"
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Google Sign In */}
      <Button
        type="button"
        variant="outline"
        className="w-full h-12 text-base font-medium hover-lift shadow-button"
        onClick={handleGoogleSignIn}
        disabled={isGoogleLoading || isLoading}
      >
        {isGoogleLoading ? (
          <Loader2 className="h-5 w-5 mr-3 animate-spin" />
        ) : (
          <GoogleIcon className="h-5 w-5 mr-3" />
        )}
        Entrar com Google
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            ou continue com email
          </span>
        </div>
      </div>

      {/* Email/Password Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="pl-10"
              required
              disabled={isLoading || isGoogleLoading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              className="pl-10 pr-10"
              required
              disabled={isLoading || isGoogleLoading}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading || isGoogleLoading}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="link"
            className="px-0 text-sm"
            onClick={onSwitchToForgot}
            disabled={isLoading || isGoogleLoading}
          >
            Esqueceu sua senha?
          </Button>
        </div>

        <Button
          type="submit"
          className="w-full h-12 text-base font-medium shadow-button hover-glow"
          disabled={isLoading || isGoogleLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Entrando...
            </>
          ) : (
            "Entrar"
          )}
        </Button>
      </form>

      <div className="text-center">
        <span className="text-sm text-muted-foreground">
          Não tem uma conta?{" "}
        </span>
        <Button
          type="button"
          variant="link"
          className="px-0 text-sm font-medium"
          onClick={onSwitchToSignUp}
          disabled={isLoading || isGoogleLoading}
        >
          Criar conta
        </Button>
      </div>
    </div>
  )
}