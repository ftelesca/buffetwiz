import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  editingRecipeItem = null,
  onSuccess
}: RecipeItemFormProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    item: "",
    qty: ""
  })
  const [isLoading, setIsLoading] = useState(false)

  // Reset form when dialog opens/closes or when editing item changes
  useEffect(() => {
    if (isOpen) {
      if (editingRecipeItem) {
        // Carregar valores para edição
        setFormData({
          item: editingRecipeItem.item?.toString() || "",
          qty: editingRecipeItem.qty?.toString() || ""
        })
      } else {
        // Reset para novo item
        setFormData({
          item: "",
          qty: ""
        })
      }
    }
  }, [isOpen, editingRecipeItem])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedRecipe) {
      toast({
        title: "Erro",
        description: "Nenhuma receita selecionada",
        variant: "destructive"
      })
      return
    }

    if (!formData.item || !formData.qty) {
      toast({
        title: "Erro",
        description: "Todos os campos são obrigatórios",
        variant: "destructive"
      })
      return
    }

    // Verificar se o item já existe na receita (apenas para novos itens)
    if (!editingRecipeItem) {
      const existingItem = recipeItems.find(
        ri => ri.item?.toString() === formData.item
      )
      
      if (existingItem) {
        toast({
          title: "Erro",
          description: "Este item já foi adicionado à receita",
          variant: "destructive"
        })
        return
      }
    }

    setIsLoading(true)

    try {
      const itemData = {
        recipe: selectedRecipe.id,
        item: parseInt(formData.item),
        qty: parseFloat(formData.qty)
      }

      if (editingRecipeItem) {
        // Atualizar item existente
        const { error } = await supabase
          .from("recipe_item")
          .update(itemData)
          .eq("id", editingRecipeItem.id)

        if (error) throw error

        toast({
          title: "Sucesso",
          description: "Item da receita atualizado com sucesso"
        })
      } else {
        // Criar novo item
        const { error } = await supabase
          .from("recipe_item")
          .insert([itemData])

        if (error) throw error

        toast({
          title: "Sucesso", 
          description: "Item adicionado à receita com sucesso"
        })
      }

      onSuccess()
      handleClose()
    } catch (error: any) {
      console.error("Erro ao salvar item da receita:", error)
      toast({
        title: "Erro",
        description: `Erro ao ${editingRecipeItem ? 'atualizar' : 'adicionar'} item: ${error.message}`,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setFormData({
      item: "",
      qty: ""
    })
  }

  const availableItems = items.filter(item => {
    if (editingRecipeItem) {
      // Se está editando, permite o item atual + itens não usados
      return !recipeItems.some(ri => 
        ri.item === item.id && ri.id !== editingRecipeItem.id
      )
    } else {
      // Se é novo, só permite itens não usados
      return !recipeItems.some(ri => ri.item === item.id)
    }
  })

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {editingRecipeItem ? "Editar Insumo" : "Adicionar Insumo"}
          </DialogTitle>
          <DialogDescription>
            {editingRecipeItem 
              ? "Edite as informações do insumo na receita" 
              : `Adicione um insumo à receita "${selectedRecipe?.description || ''}"`
            }
          </DialogDescription>
        </DialogHeader>

        {!selectedRecipe ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              Selecione uma receita primeiro
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="item-select">
                Insumo *
              </Label>
              <Select
                value={formData.item}
                onValueChange={(value) => setFormData(prev => ({ ...prev, item: value }))}
                disabled={isLoading}
              >
                <SelectTrigger id="item-select">
                  <SelectValue placeholder="Selecione um insumo" />
                </SelectTrigger>
                <SelectContent>
                  {availableItems.length > 0 ? (
                    availableItems.map((item) => (
                      <SelectItem key={item.id} value={item.id.toString()}>
                        {item.description}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1 text-sm text-muted-foreground">
                      {editingRecipeItem 
                        ? "Nenhum insumo disponível" 
                        : "Todos os insumos já foram adicionados"
                      }
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qty-input">
                Quantidade *
              </Label>
              <Input
                id="qty-input"
                type="number"
                step="0.001"
                min="0"
                value={formData.qty}
                onChange={(e) => setFormData(prev => ({ ...prev, qty: e.target.value }))}
                placeholder="Digite a quantidade"
                disabled={isLoading}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <SaveCancelButtons
                onSave={() => handleSubmit(new Event('submit') as any)}
                onCancel={handleClose}
                isLoading={isLoading}
                saveLabel={editingRecipeItem ? "Atualizar" : "Adicionar"}
              />
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
