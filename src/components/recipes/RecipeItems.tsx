import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Trash2, Plus, Edit } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
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
    return value < 0.01 ? "< 0,01" : value.toFixed(2).replace('.', ',')
  }

  console.log("RecipeItems: selectedRecipe", selectedRecipe, "recipeItems", recipeItems, "recipeItems.length", recipeItems.length)

  return (
    <Card className="h-fit">
      <CardHeader className="flex-shrink-0">
        <div className="flex justify-between items-center gap-4">
          <CardTitle className="flex-shrink-0">
            {selectedRecipe ? "Itens da Receita" : "Selecione uma receita"}
          </CardTitle>
          {selectedRecipe && (
            <Button onClick={onAddItem} size="sm" className="flex-shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Item
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="overflow-auto max-h-[70vh]">
        {selectedRecipe ? (
          <div className="space-y-4">
            <div className="overflow-x-auto">
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
                  {recipeItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum item adicionado à receita. Clique em "Adicionar Item" para começar.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recipeItems.map((recipeItem) => {
                      console.log("Rendering recipeItem:", recipeItem)
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
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir este item da receita? Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteRecipeItem(recipeItem.id)}>
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

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