import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SaveCancelButtons } from "@/components/ui/save-cancel-buttons"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import type { Recipe } from "@/types/recipe"

interface RecipeFormProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function RecipeForm({ isOpen, onOpenChange, onSuccess }: RecipeFormProps) {
  const [newRecipe, setNewRecipe] = useState({ description: "", efficiency: "1.00" })
  const { toast } = useToast()
  const { user } = useAuth()

  const addRecipe = async () => {
    if (!newRecipe.description.trim()) return

    const efficiency = parseFloat(newRecipe.efficiency) || 1.00

    const { data, error } = await supabase
      .from("recipe")
      .insert([{ description: newRecipe.description, efficiency: efficiency, user_id: user?.id }])
      .select()

    if (error) {
      toast({ title: "Erro", description: "Erro ao criar receita", variant: "destructive" })
    } else {
      toast({ title: "Receita criada com sucesso" })
      setNewRecipe({ description: "", efficiency: "1.00" })
      onOpenChange(false)
      onSuccess()
    }
  }

  const handleClose = () => {
    setNewRecipe({ description: "", efficiency: "1.00" })
    onOpenChange(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Receita</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="recipe-description">Descrição</Label>
            <Textarea
              id="recipe-description"
              value={newRecipe.description}
              onChange={(e) => setNewRecipe({ description: e.target.value })}
              onChange={(e) => setNewRecipe({ ...newRecipe, description: e.target.value })}
              placeholder="Digite a descrição da receita..."
            />
          </div>
          <div>
            <Label htmlFor="recipe-efficiency">Rendimento</Label>
            <Input
              id="recipe-efficiency"
              type="number"
              step="0.01"
              min="0.01"
              value={newRecipe.efficiency}
              onChange={(e) => setNewRecipe({ ...newRecipe, efficiency: e.target.value })}
              placeholder="1.00"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Fator de rendimento da receita (ex: 1.20 = 20% a mais de rendimento)
            </p>
          </div>
          <SaveCancelButtons
            onSave={addRecipe}
            onCancel={handleClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}