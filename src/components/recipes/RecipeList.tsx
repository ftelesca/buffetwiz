import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Trash2, Edit } from "lucide-react"
import { SaveCancelButtons } from "@/components/ui/save-cancel-buttons"
import { getCountText } from "@/lib/utils"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
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
  const { toast } = useToast()

  const saveRecipe = async () => {
    if (editingRecipe) {
      const { error } = await supabase
        .from("recipe")
        .update({ description: editingRecipe.description })
        .eq("id", editingRecipe.id)

      if (error) {
        toast({ title: "Erro", description: "Erro ao atualizar receita", variant: "destructive" })
      } else {
        toast({ title: "Receita atualizada com sucesso" })
        setEditingRecipe(null)
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
      toast({ title: "Sucesso", description: "Receita excluída com sucesso" })
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
        <div className="space-y-2">
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
                    <Input
                      value={editingRecipe.description}
                      onChange={(e) =>
                        setEditingRecipe({
                          ...editingRecipe,
                          description: e.target.value,
                        })
                      }
                      className="flex-1"
                    />
                     <SaveCancelButtons
                       onSave={saveRecipe}
                       onCancel={() => setEditingRecipe(null)}
                     />
                  </div>
                ) : (
                  <>
                    <span className="font-medium">{recipe.description}</span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingRecipe(recipe)
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir a receita "{recipe.description}"? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteRecipe(recipe.id)}>
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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