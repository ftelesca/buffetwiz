import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import type { Recipe } from "@/types/recipe"

interface RecipeFormProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function RecipeForm({ isOpen, onOpenChange, onSuccess }: RecipeFormProps) {
  const [newRecipe, setNewRecipe] = useState({ description: "" })
  const { toast } = useToast()

  const addRecipe = async () => {
    if (!newRecipe.description.trim()) return

    const { data, error } = await supabase
      .from("recipe")
      .insert([{ description: newRecipe.description }])
      .select()

    if (error) {
      toast({ title: "Erro", description: "Erro ao criar receita", variant: "destructive" })
    } else {
      toast({ title: "Sucesso", description: "Receita criada com sucesso" })
      setNewRecipe({ description: "" })
      onOpenChange(false)
      onSuccess()
    }
  }

  const handleClose = () => {
    setNewRecipe({ description: "" })
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
              placeholder="Digite a descrição da receita..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button onClick={addRecipe}>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}