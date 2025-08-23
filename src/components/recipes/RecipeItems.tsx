import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Trash2, Plus, Edit } from "lucide-react"
import type { Recipe, RecipeItem, Unit } from "@/types/recipe"

interface RecipeItemsProps {
  selectedRecipe: Recipe | null
  recipeItems: RecipeItem[]
  units: Unit[]
  onAddItem: () => void
  onEditItem: (recipeItem: RecipeItem) => void
  onRecipeItemsChange: () => void
}

export default function RecipeItems({ 
  selectedRecipe, 
  recipeItems, 
  units, 
  onAddItem, 
  onEditItem,
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

  // Calculate total recipe cost
  const totalRecipeCost = recipeItems.reduce((total, recipeItem) => {
    const item = recipeItem.item_detail
    const unitCost = item?.cost || 0
    const factor = item?.factor || 1
    const adjustedUnitCost = unitCost / factor
    const itemTotalCost = adjustedUnitCost * recipeItem.qty
    return total + itemTotalCost
  }, 0)

  const formatCurrency = (value: number) => {
    if (value < 0.01) return "< 0,01"
    const valueStr = value.toString()
    const decimalPart = valueStr.split('.')[1]
    if (decimalPart && decimalPart.length > 2) {
      return value.toFixed(2).replace('.', ',')
    }
    return valueStr.replace('.', ',')
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>
            {selectedRecipe ? "Itens da Receita" : "Selecione uma receita"}
          </CardTitle>
          {selectedRecipe && (
            <Button onClick={onAddItem} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Item
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {selectedRecipe ? (
          <div className="space-y-4">

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead>Unidade</TableHead>
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
                  const unitCost = item?.cost || 0  // custo da unidade de compra
                  const factor = item?.factor || 1  // fator de conversão
                  const adjustedUnitCost = unitCost / factor  // custo unitario = custo da unidade de compra / fator
                  const totalCost = adjustedUnitCost * recipeItem.qty

                  return (
                    <TableRow key={recipeItem.id}>
                      <TableCell className="font-medium">{item?.description}</TableCell>
                      <TableCell className="text-right">{formatQuantity(recipeItem.qty)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{unitDescription}</Badge>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">{formatCurrency(adjustedUnitCost)}</TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">{formatCurrency(totalCost)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onEditItem(recipeItem)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteRecipeItem(recipeItem.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            {/* Total Cost Card */}
            <Card className="mt-4">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium">Custo Total da Receita:</span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(totalRecipeCost)}
                  </span>
                </div>
              </CardContent>
            </Card>
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