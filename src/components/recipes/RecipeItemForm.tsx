import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SaveCancelButtons } from "@/components/ui/save-cancel-buttons"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import type { Recipe, Item, RecipeItem } from "@/types/recipe"

interface RecipeItemFormProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  selectedRecipe: Recipe | null
  items: Item[]
  recipeItems: RecipeItem[]
  editingRecipeItem?: RecipeItem | null
  onSuccess: () => void
}

export default function RecipeItemForm({ 
  isOpen, 
  onOpenChange, 
  selectedRecipe, 
  items, 
  recipeItems, 
  editingRecipeItem,
  onSuccess 
}: RecipeItemFormProps) {
  const [newRecipeItem, setNewRecipeItem] = useState({ item: "", qty: "" })
  const { toast } = useToast()

  // Initialize form when editing
  useEffect(() => {
    if (editingRecipeItem) {
      setNewRecipeItem({
        item: editingRecipeItem.item.toString(),
        qty: editingRecipeItem.qty.toString()
      })
    } else {
      setNewRecipeItem({ item: "", qty: "" })
    }
  }, [editingRecipeItem, isOpen])

  const saveRecipeItem = async () => {
    if (!selectedRecipe || !newRecipeItem.item || !newRecipeItem.qty) return

    const itemId = parseInt(newRecipeItem.item)
    
    if (editingRecipeItem) {
      // Update existing recipe item
      const { error } = await supabase
        .from("recipe_item")
        .update({
          item: itemId,
          qty: parseFloat(newRecipeItem.qty)
        })
        .eq("id", editingRecipeItem.id)

      if (error) {
        toast({ title: "Erro", description: "Erro ao atualizar item", variant: "destructive" })
      } else {
        toast({ title: "Insumo atualizado com sucesso" })
        setNewRecipeItem({ item: "", qty: "" })
        onOpenChange(false)
        onSuccess()
      }
    } else {
      // Check if item already exists in recipe (only for new items)
      const itemAlreadyExists = recipeItems.some(recipeItem => recipeItem.item === itemId)
      
      if (itemAlreadyExists) {
        toast({ 
          title: "Erro", 
          description: "Este item já foi adicionado à receita", 
          variant: "destructive" 
        })
        return
      }

      // Create new recipe item
      const { error } = await supabase
        .from("recipe_item")
        .insert([{
          recipe: selectedRecipe.id,
          item: itemId,
          qty: parseFloat(newRecipeItem.qty)
        }])

      if (error) {
        toast({ title: "Erro", description: "Erro ao adicionar insumo", variant: "destructive" })
      } else {
        toast({ title: "Sucesso", description: "Insumo adicionado com sucesso" })
        setNewRecipeItem({ item: "", qty: "" })
        onOpenChange(false)
        onSuccess()
      }
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
          <DialogTitle>{editingRecipeItem ? 'Editar Insumo da Receita' : 'Adicionar Insumo à Receita'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="item-select">Item</Label>
            <Select 
              value={newRecipeItem.item} 
              onValueChange={(value) => setNewRecipeItem({ ...newRecipeItem, item: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um insumo" />
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
          <SaveCancelButtons
            onSave={saveRecipeItem}
            onCancel={handleClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}