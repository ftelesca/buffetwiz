import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SaveCancelButtons } from "@/components/ui/save-cancel-buttons"
import { useToast } from "@/hooks/use-toast"
import { User, Mail, Camera } from "lucide-react"

interface ProfileFormProps {
  onClose: () => void
}

export function ProfileForm({ onClose }: ProfileFormProps) {
  const { user, profile, updateProfile } = useAuth()
  const [formData, setFormData] = useState({
    full_name: "",
    avatar_url: ""
  })
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        avatar_url: profile.avatar_url || ""
      })
    }
  }, [profile])

  const handleSubmit = async () => {
    if (!formData.full_name.trim()) {
      toast({
        title: "Erro",
        description: "Nome completo é obrigatório.",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      await updateProfile(formData)
      onClose()
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar perfil",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getInitials = (name?: string) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map(word => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="space-y-6">
      {/* Avatar Section */}
      <div className="flex flex-col items-center space-y-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={formData.avatar_url} alt={formData.full_name} />
          <AvatarFallback className="bg-primary/10 text-primary font-medium text-lg">
            {getInitials(formData.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Foto do perfil será sincronizada automaticamente com sua conta Google
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              value={user?.email || ""}
              className="pl-10 bg-muted/50"
              disabled
            />
          </div>
          <p className="text-xs text-muted-foreground">
            O email não pode ser alterado
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullName">Nome Completo</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="fullName"
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Seu nome completo"
              className="pl-10"
              required
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      <SaveCancelButtons
        onSave={handleSubmit}
        onCancel={onClose}
        isLoading={isLoading}
        saveLabel="Salvar"
      />
    </div>
  )
}