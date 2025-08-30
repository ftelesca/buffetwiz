import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Plus, Search, Upload } from "lucide-react"
import { MainLayout } from "@/components/layout/MainLayout"
import { PageHeader } from "@/components/ui/page-header"
import RecipeList from "@/components/recipes/RecipeList"
import RecipeItems from "@/components/recipes/RecipeItems"
import RecipeForm from "@/components/recipes/RecipeForm"
import RecipeItemForm from "@/components/recipes/RecipeItemForm"
import { RecipeSpreadsheetImport } from "@/components/recipes/RecipeSpreadsheetImport"
import type { Recipe, Item, Unit, RecipeItem } from "@/types/recipe"

export default function Recipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([])
  const [isAddingRecipe, setIsAddingRecipe] = useState(false)
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [editingRecipeItem, setEditingRecipeItem] = useState<RecipeItem | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)

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
      toast({ title: "Erro", description: "Erro ao carregar insumos da receita", variant: "destructive" })
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

  const handleEditItem = (recipeItem: RecipeItem) => {
    setEditingRecipeItem(recipeItem)
    setIsAddingItem(true)
  }

  const handleAddItem = () => {
    setEditingRecipeItem(null)
    setIsAddingItem(true)
  }

  const filteredRecipes = recipes.filter(recipe =>
    recipe.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Receitas"
          subtitle="Gerencie receitas e seus insumos"
        >
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsImportDialogOpen(true)}
            >
              <Upload className="h-4 w-4" />
              Importar Planilha
            </Button>
            <Button onClick={() => setIsAddingRecipe(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Receita
            </Button>
          </div>
        </PageHeader>

        {/* Search */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar receitas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecipeList
            recipes={filteredRecipes}
            selectedRecipe={selectedRecipe}
            onSelectRecipe={handleSelectRecipe}
            onRecipesChange={handleRecipesChange}
            allRecipes={recipes}
            searchTerm={searchTerm}
          />

          <RecipeItems
            selectedRecipe={selectedRecipe}
            recipeItems={recipeItems}
            units={units}
            onAddItem={handleAddItem}
            onEditItem={handleEditItem}
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
          onOpenChange={(open) => {
            setIsAddingItem(open)
            if (!open) setEditingRecipeItem(null)
          }}
          selectedRecipe={selectedRecipe}
          items={items}
          recipeItems={recipeItems}
          editingRecipeItem={editingRecipeItem}
          onSuccess={handleRecipeItemsChange}
        />

        <RecipeSpreadsheetImport
          isOpen={isImportDialogOpen}
          onClose={() => setIsImportDialogOpen(false)}
          onImportComplete={() => {
            fetchRecipes()
            if (selectedRecipe) {
              fetchRecipeItems(selectedRecipe.id)
            }
          }}
        />
      </div>
    </MainLayout>
  )
}