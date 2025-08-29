import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Mail, Loader2, CheckCircle, ArrowLeft } from "lucide-react"

interface ForgotPasswordFormProps {
  onSwitchToLogin: () => void
}

export function ForgotPasswordForm({ onSwitchToLogin }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  
  const { resetPassword } = useAuth()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await resetPassword(email)
      setEmailSent(true)
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar email de recuperação",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <CheckCircle className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Email enviado</h3>
          <p className="text-muted-foreground">
            Enviamos um link de recuperação para <strong>{email}</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            Verifique sua caixa de entrada e clique no link para redefinir sua senha.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={onSwitchToLogin}
          className="w-full"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao login
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
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
              disabled={isLoading}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Digite o email da sua conta para receber o link de recuperação.
          </p>
        </div>

        <Button
          type="submit"
          className="w-full h-12 text-base font-medium shadow-button hover-glow"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            "Enviar link de recuperação"
          )}
        </Button>
      </form>

      <div className="text-center">
        <Button
          type="button"
          variant="link"
          className="px-0 text-sm font-medium"
          onClick={onSwitchToLogin}
          disabled={isLoading}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar ao login
        </Button>
      </div>
    </div>
  )
}