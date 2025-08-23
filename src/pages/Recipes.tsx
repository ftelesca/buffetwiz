import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { Trash2, Edit, Plus, Save, X } from "lucide-react"
import { MainLayout } from "@/components/layout/MainLayout"

interface Recipe {
  id: number
  description: string
}

interface Item {
  id: number
  description: string
  unit: number
  cost: number
}

interface Unit {
  id: number
  description: string
}

interface RecipeItem {
  id: number
  recipe: number
  item: number
  qty: number
  item_detail?: Item
}

export default function Recipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([])
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [newRecipe, setNewRecipe] = useState({ description: "" })
  const [newRecipeItem, setNewRecipeItem] = useState({ item: "", qty: "" })
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

  const saveRecipe = async () => {
    if (editingRecipe) {
      const { error } = await supabase
        .from("recipe")
        .update({ description: editingRecipe.description })
        .eq("id", editingRecipe.id)

      if (error) {
        toast({ title: "Erro", description: "Erro ao atualizar receita", variant: "destructive" })
      } else {
        toast({ title: "Sucesso", description: "Receita atualizada com sucesso" })
        setEditingRecipe(null)
        fetchRecipes()
      }
    }
  }

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
      setIsAddingRecipe(false)
      fetchRecipes()
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
      if (selectedRecipe?.id === id) {
        setSelectedRecipe(null)
        setRecipeItems([])
      }
      fetchRecipes()
    }
  }

  const addRecipeItem = async () => {
    if (!selectedRecipe || !newRecipeItem.item || !newRecipeItem.qty) return

    // Verificar se o item já existe na receita
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
      setIsAddingItem(false)
      fetchRecipeItems(selectedRecipe.id)
    }
  }

  const deleteRecipeItem = async (id: number) => {
    const { error } = await supabase
      .from("recipe_item")
      .delete()
      .eq("id", id)

    if (error) {
      toast({ title: "Erro", description: "Erro ao excluir item", variant: "destructive" })
    } else {
      toast({ title: "Sucesso", description: "Item excluído com sucesso" })
      if (selectedRecipe) {
        fetchRecipeItems(selectedRecipe.id)
      }
    }
  }

  const getUnitDescription = (unitId: number) => {
    const unit = units.find(u => u.id === unitId)
    return unit?.description || ""
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Gerenciamento de Receitas</h1>
          <Button onClick={() => setIsAddingRecipe(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Receita
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recipes List */}
          <Card>
            <CardHeader>
              <CardTitle>Receitas</CardTitle>
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
                    onClick={() => setSelectedRecipe(recipe)}
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
                          <Button size="sm" onClick={saveRecipe}>
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingRecipe(null)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
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
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteRecipe(recipe.id)
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recipe Items */}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedRecipe ? `Itens da Receita: ${selectedRecipe.description}` : "Selecione uma receita"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedRecipe ? (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button onClick={() => setIsAddingItem(true)} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Item
                    </Button>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Unidade</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recipeItems.map((recipeItem) => (
                        <TableRow key={recipeItem.id}>
                          <TableCell>{recipeItem.item_detail?.description}</TableCell>
                          <TableCell>{recipeItem.qty}</TableCell>
                          <TableCell>
                            {recipeItem.item_detail?.unit ? getUnitDescription(recipeItem.item_detail.unit) : ""}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteRecipeItem(recipeItem.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Selecione uma receita para ver seus itens
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Add Recipe Dialog */}
        <Dialog open={isAddingRecipe} onOpenChange={setIsAddingRecipe}>
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
                <Button variant="outline" onClick={() => setIsAddingRecipe(false)}>
                  Cancelar
                </Button>
                <Button onClick={addRecipe}>Salvar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Recipe Item Dialog */}
        <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Item à Receita</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="item-select">Item</Label>
                <Select value={newRecipeItem.item} onValueChange={(value) => setNewRecipeItem({ ...newRecipeItem, item: value })}>
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
                  step="0.01"
                  value={newRecipeItem.qty}
                  onChange={(e) => setNewRecipeItem({ ...newRecipeItem, qty: e.target.value })}
                  placeholder="Digite a quantidade..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddingItem(false)}>
                  Cancelar
                </Button>
                <Button onClick={addRecipeItem}>Adicionar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}