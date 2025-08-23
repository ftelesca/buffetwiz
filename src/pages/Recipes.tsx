import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { Plus } from "lucide-react"
import { MainLayout } from "@/components/layout/MainLayout"
import RecipeList from "@/components/recipes/RecipeList"
import RecipeItems from "@/components/recipes/RecipeItems"
import RecipeForm from "@/components/recipes/RecipeForm"
import RecipeItemForm from "@/components/recipes/RecipeItemForm"
import type { Recipe, Item, Unit, RecipeItem } from "@/types/recipe"

export default function Recipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([])
  const [isAddingRecipe, setIsAddingRecipe] = useState(false)
  const [isAddingItem, setIsAddingItem] = useState(false)

  useEffect(() => {
    fetchRecipes()
    fetchItems()
    fetchUnits()
  }, [])

  useEffect(() => {
    if (selectedRecipe) {
      fetchRecipeItems(selectedRecipe.id)
    } else {
      setRecipeItems([])
    }
  }, [selectedRecipe])

  const fetchRecipes = async () => {
    const { data, error } = await supabase
      .from("recipe")
      .select("*")
      .order("description")

    if (error) {
      toast({ title: "Erro", description: "Erro ao carregar receitas", variant: "destructive" })
    } else {
      setRecipes(data || [])
    }
  }

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("item")
      .select("*")
      .order("description")

    if (error) {
      toast({ title: "Erro", description: "Erro ao carregar itens", variant: "destructive" })
    } else {
      setItems(data || [])
    }
  }

  const fetchUnits = async () => {
    const { data, error } = await supabase
      .from("unit")
      .select("*")
      .order("description")

    if (error) {
      toast({ title: "Erro", description: "Erro ao carregar unidades", variant: "destructive" })
    } else {
      setUnits(data || [])
    }
  }

  const fetchRecipeItems = async (recipeId: number) => {
    const { data, error } = await supabase
      .from("recipe_item")
      .select(`
        *,
        item_detail:item(*)
      `)
      .eq("recipe", recipeId)

    if (error) {
      toast({ title: "Erro", description: "Erro ao carregar itens da receita", variant: "destructive" })
    } else {
      setRecipeItems(data || [])
    }
  }

  const handleSelectRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe)
  }

  const handleRecipesChange = () => {
    fetchRecipes()
    // If current selected recipe was deleted, clear selection
    if (selectedRecipe) {
      fetchRecipes().then(() => {
        const stillExists = recipes.find(r => r.id === selectedRecipe.id)
        if (!stillExists) {
          setSelectedRecipe(null)
        }
      })
    }
  }

  const handleRecipeItemsChange = () => {
    if (selectedRecipe) {
      fetchRecipeItems(selectedRecipe.id)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Receitas</h1>
            <p className="text-muted-foreground">Gerencie receitas e seus ingredientes</p>
          </div>
          <Button onClick={() => setIsAddingRecipe(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Receita
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecipeList
            recipes={recipes}
            selectedRecipe={selectedRecipe}
            onSelectRecipe={handleSelectRecipe}
            onRecipesChange={handleRecipesChange}
          />

          <RecipeItems
            selectedRecipe={selectedRecipe}
            recipeItems={recipeItems}
            units={units}
            onAddItem={() => setIsAddingItem(true)}
            onRecipeItemsChange={handleRecipeItemsChange}
          />
        </div>

        <RecipeForm
          isOpen={isAddingRecipe}
          onOpenChange={setIsAddingRecipe}
          onSuccess={fetchRecipes}
        />

        <RecipeItemForm
          isOpen={isAddingItem}
          onOpenChange={setIsAddingItem}
          selectedRecipe={selectedRecipe}
          items={items}
          recipeItems={recipeItems}
          onSuccess={handleRecipeItemsChange}
        />
      </div>
    </MainLayout>
  )
}