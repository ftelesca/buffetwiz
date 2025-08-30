import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Edit } from "lucide-react";
import { getDeletedMessage } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ActionButtons } from "@/components/ui/action-buttons";
import type { Recipe, RecipeItem, Unit } from "@/types/recipe";
interface RecipeItemsProps {
  selectedRecipe: Recipe | null;
  recipeItems: RecipeItem[];
  units: Unit[];
  onAddItem: () => void;
  onEditItem: (recipeItem: RecipeItem) => void;
  onRecipeItemsChange: () => void;
}
export default function RecipeItems({
  selectedRecipe,
  recipeItems,
  units,
  onAddItem,
  onEditItem,
  onRecipeItemsChange
}: RecipeItemsProps) {
  const {
    toast
  } = useToast();
  const deleteRecipeItem = async (id: number) => {
    const {
      error
    } = await supabase.from("recipe_item").delete().eq("id", id);
    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir item",
        variant: "destructive"
      });
    } else {
      toast({ title: getDeletedMessage("item", "m") });
      onRecipeItemsChange();
    }
  };
  const getUnitDescription = (unitId: number) => {
    const unit = units.find(u => u.id === unitId);
    return unit?.description || "";
  };
  const formatQuantity = (qty: number) => {
    return qty.toString().replace('.', ',');
  };

  // Calculate total recipe cost with full precision for each item, only round final result
  const totalRecipeCost = recipeItems.reduce((total, recipeItem) => {
    const item = recipeItem.item_detail;
    const unitCost = Number(item?.cost || 0);
    const factor = Number(item?.factor || 1);
    const adjustedUnitCost = unitCost / factor;
    const itemTotalCost = adjustedUnitCost * Number(recipeItem.qty); // Keep full precision
    return total + itemTotalCost;
  }, 0);
  
  const formatCurrency = (value: number) => {
    // Only round the final display value, not intermediate calculations
    return value < 0.01 ? "< R$ 0,01" : `R$ ${value.toFixed(2).replace('.', ',')}`;
  };
  
  const formatItemCost = (recipeItem: RecipeItem) => {
    const item = recipeItem.item_detail;
    const unitCost = Number(item?.cost || 0);
    const factor = Number(item?.factor || 1);
    const adjustedUnitCost = unitCost / factor;
    const itemTotalCost = adjustedUnitCost * Number(recipeItem.qty);
    // Round individual item costs for display only
    return itemTotalCost < 0.01 ? "< R$ 0,01" : `R$ ${itemTotalCost.toFixed(2).replace('.', ',')}`;
  };
  
  return <Card className="h-fit">
      <CardHeader className="flex-shrink-0">
        <div className="flex justify-between items-center gap-4">
          <CardTitle className="flex-shrink-0">
            {selectedRecipe ? "Insumos da Receita" : "Selecione uma receita"}
          </CardTitle>
          {selectedRecipe && <Button onClick={onAddItem} size="sm" className="flex-shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Insumo
            </Button>}
        </div>
      </CardHeader>
      <CardContent className="overflow-auto max-h-[70vh]">
        {selectedRecipe ? <div className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-center">Unidade</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead className="text-center w-[120px] sticky right-0">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipeItems.length === 0 ? <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum insumo adicionado à receita. Clique em "Adicionar Insumo" para começar.
                      </TableCell>
                    </TableRow> : recipeItems.map(recipeItem => {
                const item = recipeItem.item_detail;
                const unitDescription = item?.unit_use ? getUnitDescription(item.unit_use) : item?.unit_purch ? getUnitDescription(item.unit_purch) : "";
                return <TableRow key={recipeItem.id}>
                          <TableCell className="font-medium">{item?.description}</TableCell>
                          <TableCell className="text-right">{formatQuantity(recipeItem.qty)}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{unitDescription}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium whitespace-nowrap">{formatItemCost(recipeItem)}</TableCell>
                          <TableCell className="sticky right-0 text-center">
                            <ActionButtons
                              onEdit={() => onEditItem(recipeItem)}
                              onDelete={() => deleteRecipeItem(recipeItem.id)}
                              itemName={item?.description || "este item"}
                              itemType="este item da receita"
                            />
                          </TableCell>
                        </TableRow>;
              })}
                </TableBody>
              </Table>
            </div>

            {/* Total Cost Card */}
            <Card className="mt-4">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium">Custo Total:</span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(totalRecipeCost)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div> : <p className="text-muted-foreground text-center py-8">
            Selecione uma receita para ver seus itens
          </p>}
      </CardContent>
    </Card>;
}