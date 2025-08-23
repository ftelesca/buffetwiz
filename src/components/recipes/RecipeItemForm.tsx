import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import type { Recipe, Item, RecipeItem } from "@/types/recipe"

interface RecipeItemFormProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  selectedRecipe: Recipe | null
  items: Item[]
  recipeItems: RecipeItem[]
  onSuccess: () => void
}

export default function RecipeItemForm({ 
  isOpen, 
  onOpenChange, 
  selectedRecipe, 
  items, 
  recipeItems, 
  onSuccess 
}: RecipeItemFormProps) {
  const [newRecipeItem, setNewRecipeItem] = useState({ item: "", qty: "" })
  const { toast } = useToast()

  const addRecipeItem = async () => {
    if (!selectedRecipe || !newRecipeItem.item || !newRecipeItem.qty) return

    // Check if item already exists in recipe
    const itemId = parseInt(newRecipeItem.item)
    const itemAlreadyExists = recipeItems.some(recipeItem => recipeItem.item === itemId)
    
    if (itemAlreadyExists) {
      toast({ 
        title: "Erro", 
        description: "Este item já foi adicionado à receita", 
        variant: "destructive" 
      })
      return
    }

    const { error } = await supabase
      .from("recipe_item")
      .insert([{
        recipe: selectedRecipe.id,
        item: itemId,
        qty: parseFloat(newRecipeItem.qty)
      }])

    if (error) {
      toast({ title: "Erro", description: "Erro ao adicionar item", variant: "destructive" })
    } else {
      toast({ title: "Sucesso", description: "Item adicionado com sucesso" })
      setNewRecipeItem({ item: "", qty: "" })
      onOpenChange(false)
      onSuccess()
    }
  }

  const handleClose = () => {
    setNewRecipeItem({ item: "", qty: "" })
    onOpenChange(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Item à Receita</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="item-select">Item</Label>
            <Select 
              value={newRecipeItem.item} 
              onValueChange={(value) => setNewRecipeItem({ ...newRecipeItem, item: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um item" />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.id} value={item.id.toString()}>
                    {item.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="qty-input">Quantidade</Label>
            <Input
              id="qty-input"
              type="number"
              step="0.001"
              value={newRecipeItem.qty}
              onChange={(e) => setNewRecipeItem({ ...newRecipeItem, qty: e.target.value })}
              placeholder="Digite a quantidade..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button onClick={addRecipeItem}>Adicionar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}