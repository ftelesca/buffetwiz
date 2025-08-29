import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff, Mail, Lock, User, Loader2, CheckCircle } from "lucide-react"
import { GoogleIcon } from "./GoogleIcon"

interface SignUpFormProps {
  onSwitchToLogin: () => void
}

export function SignUpForm({ onSwitchToLogin }: SignUpFormProps) {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: ""
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  
  const { signUp, signInWithGoogle } = useAuth()
  const { toast } = useToast()

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8
    const hasUpperCase = /[A-Z]/.test(password)
    const hasNumber = /\d/.test(password)
    
    return {
      minLength,
      hasUpperCase,
      hasNumber,
      isValid: minLength && hasUpperCase && hasNumber
    }
  }

  const passwordValidation = validatePassword(formData.password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!passwordValidation.isValid) {
      toast({
        title: "Senha inválida",
        description: "A senha deve ter pelo menos 8 caracteres, uma letra maiúscula e um número.",
        variant: "destructive"
      })
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "As senhas digitadas não são iguais.",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)

    try {
      await signUp(formData.email, formData.password, formData.fullName)
      setEmailSent(true)
    } catch (error: any) {
      toast({
        title: "Erro no cadastro",
        description: error.message || "Erro ao criar conta",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    try {
      await signInWithGoogle()
    } catch (error: any) {
      toast({
        title: "Erro no cadastro",
        description: error.message || "Erro ao fazer cadastro com Google",
        variant: "destructive"
      })
      setIsGoogleLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <CheckCircle className="h-8 w-8 text-success" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Verifique seu email</h3>
          <p className="text-muted-foreground">
            Enviamos um link de verificação para <strong>{formData.email}</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            Clique no link para ativar sua conta e fazer login.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={onSwitchToLogin}
          className="w-full"
        >
          Voltar ao login
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Google Sign Up */}
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
        Cadastrar com Google
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            ou cadastre-se com email
          </span>
        </div>
      </div>

      {/* Email/Password Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Nome Completo</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="fullName"
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Seu nome completo"
              className="pl-10"
              required
              disabled={isLoading || isGoogleLoading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
          
          {/* Password Requirements */}
          {formData.password && (
            <div className="space-y-1 text-xs">
              <div className={`flex items-center gap-2 ${passwordValidation.minLength ? 'text-success' : 'text-muted-foreground'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${passwordValidation.minLength ? 'bg-success' : 'bg-muted-foreground'}`} />
                Pelo menos 8 caracteres
              </div>
              <div className={`flex items-center gap-2 ${passwordValidation.hasUpperCase ? 'text-success' : 'text-muted-foreground'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${passwordValidation.hasUpperCase ? 'bg-success' : 'bg-muted-foreground'}`} />
                Uma letra maiúscula
              </div>
              <div className={`flex items-center gap-2 ${passwordValidation.hasNumber ? 'text-success' : 'text-muted-foreground'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${passwordValidation.hasNumber ? 'bg-success' : 'bg-muted-foreground'}`} />
                Um número
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar Senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="Confirme sua senha"
              className="pl-10 pr-10"
              required
              disabled={isLoading || isGoogleLoading}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={isLoading || isGoogleLoading}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-12 text-base font-medium shadow-button hover-glow"
          disabled={isLoading || isGoogleLoading || !passwordValidation.isValid}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Criando conta...
            </>
          ) : (
            "Criar conta"
          )}
        </Button>
      </form>

      <div className="text-center">
        <span className="text-sm text-muted-foreground">
          Já tem uma conta?{" "}
        </span>
        <Button
          type="button"
          variant="link"
          className="px-0 text-sm font-medium"
          onClick={onSwitchToLogin}
          disabled={isLoading || isGoogleLoading}
        >
          Fazer login
        </Button>
      </div>
    </div>
  )
}