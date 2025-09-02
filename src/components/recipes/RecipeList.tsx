import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Trash2, Edit } from "lucide-react"
import { SaveCancelButtons } from "@/components/ui/save-cancel-buttons"
import { getCountText, getDeletedMessage } from "@/lib/utils"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { ActionButtons } from "@/components/ui/action-buttons"
import type { Recipe } from "@/types/recipe"

interface RecipeListProps {
  recipes: Recipe[]
  selectedRecipe: Recipe | null
  onSelectRecipe: (recipe: Recipe) => void
  onRecipesChange: () => void
  allRecipes: Recipe[]
  searchTerm: string
}

export default function RecipeList({ recipes, selectedRecipe, onSelectRecipe, onRecipesChange, allRecipes, searchTerm }: RecipeListProps) {
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [editingEfficiency, setEditingEfficiency] = useState("")
  const { toast } = useToast()

  const startEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe)
    setEditingEfficiency((recipe.efficiency || 1.00).toString())
  }

  const saveRecipe = async () => {
    if (editingRecipe) {
      const efficiency = parseFloat(editingEfficiency) || 1.00
      
      const { error } = await supabase
        .from("recipe")
        .update({ description: editingRecipe.description, efficiency: efficiency })
        .eq("id", editingRecipe.id)

      if (error) {
        toast({ title: "Erro", description: "Erro ao atualizar receita", variant: "destructive" })
      } else {
        toast({ title: "Receita atualizada com sucesso" })
        setEditingRecipe(null)
        setEditingEfficiency("")
        onRecipesChange()
      }
    }
  }

  const deleteRecipe = async (id: number) => {
    const { error } = await supabase
      .from("recipe")
      .delete()
      .eq("id", id)

    if (error) {
      toast({ title: "Erro", description: "Erro ao excluir receita", variant: "destructive" })
    } else {
      toast({ title: "Receita excluída com sucesso" })
      onRecipesChange()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receitas</CardTitle>
        <CardDescription>
          {getCountText(
            allRecipes.length,
            recipes.length,
            !!searchTerm,
            "receita",
            "receitas",
            "receita cadastrada",
            "receitas cadastradas",
            "encontrada",
            "encontradas"
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto scrollbar-thin">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedRecipe?.id === recipe.id
                  ? "bg-primary/10 border-primary"
                  : "hover:bg-accent"
              }`}
              onClick={() => onSelectRecipe(recipe)}
            >
              <div className="flex justify-between items-center">
                {editingRecipe?.id === recipe.id ? (
                  <div className="flex-1 flex gap-2">
                    <div className="flex-1 space-y-2">
                      <Input
                        value={editingRecipe.description}
                        onChange={(e) =>
                          setEditingRecipe({
                            ...editingRecipe,
                            description: e.target.value,
                          })
                        }
                        placeholder="Descrição da receita"
                      />
                      <div className="flex items-center gap-2">
                        <Label htmlFor="efficiency" className="text-xs whitespace-nowrap">Rendimento:</Label>
                        <Input
                          id="efficiency"
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={editingEfficiency}
                          onChange={(e) => setEditingEfficiency(e.target.value)}
                          className="w-20 text-xs"
                          placeholder="1.00"
                        />
                      </div>
                    </div>
                     <SaveCancelButtons
                       onSave={saveRecipe}
                       onCancel={() => {
                         setEditingRecipe(null)
                         setEditingEfficiency("")
                       }}
                     />
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <span className="font-medium">
                        {recipe.description}
                        {recipe.efficiency && recipe.efficiency !== 1.00 && (
                          <span className="text-muted-foreground font-normal ml-2">
                            (x {recipe.efficiency.toFixed(1)})
                          </span>
                        )}
                      </span>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <ActionButtons
                        onEdit={() => startEdit(recipe)}
                        onDelete={() => deleteRecipe(recipe.id)}
                        itemName={recipe.description}
                        itemType="a receita"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}