import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Trash2, Plus } from "lucide-react"
import type { Recipe, RecipeItem, Unit } from "@/types/recipe"

interface RecipeItemsProps {
  selectedRecipe: Recipe | null
  recipeItems: RecipeItem[]
  units: Unit[]
  onAddItem: () => void
  onRecipeItemsChange: () => void
}

export default function RecipeItems({ 
  selectedRecipe, 
  recipeItems, 
  units, 
  onAddItem, 
  onRecipeItemsChange 
}: RecipeItemsProps) {
  const { toast } = useToast()

  const deleteRecipeItem = async (id: number) => {
    const { error } = await supabase
      .from("recipe_item")
      .delete()
      .eq("id", id)

    if (error) {
      toast({ title: "Erro", description: "Erro ao excluir item", variant: "destructive" })
    } else {
      toast({ title: "Sucesso", description: "Item excluído com sucesso" })
      onRecipeItemsChange()
    }
  }

  const getUnitDescription = (unitId: number) => {
    const unit = units.find(u => u.id === unitId)
    return unit?.description || ""
  }

  const formatQuantity = (qty: number) => {
    return qty.toString().replace('.', ',')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {selectedRecipe ? "Itens da Receita" : "Selecione uma receita"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {selectedRecipe ? (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={onAddItem} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Item
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Fator</TableHead>
                  <TableHead className="text-right">Custo Unit.</TableHead>
                  <TableHead className="text-right">Custo Total</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipeItems.map((recipeItem) => {
                  const item = recipeItem.item_detail
                  const unitDescription = item?.unit_use ? getUnitDescription(item.unit_use) : 
                                        item?.unit_purch ? getUnitDescription(item.unit_purch) : ""
                  const unitCost = item?.cost || 0
                  const factor = item?.factor || 1
                  const adjustedUnitCost = unitCost / factor
                  const totalCost = adjustedUnitCost * recipeItem.qty

                  return (
                    <TableRow key={recipeItem.id}>
                      <TableCell className="font-medium">{item?.description}</TableCell>
                      <TableCell className="text-right">{formatQuantity(recipeItem.qty)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{unitDescription}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{factor}</TableCell>
                      <TableCell className="text-right">{adjustedUnitCost.toFixed(2).replace('.', ',')}</TableCell>
                      <TableCell className="text-right font-medium">{totalCost.toFixed(2).replace('.', ',')}</TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteRecipeItem(recipeItem.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
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
  )
}