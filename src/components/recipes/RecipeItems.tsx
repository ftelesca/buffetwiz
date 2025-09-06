import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Edit } from "lucide-react";
import { getDeletedMessage } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
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
  const deleteRecipeItem = async (recipe: number, item: number) => {
    const {
      error
    } = await supabase.from("recipe_item").delete().eq("recipe", recipe).eq("item", item);
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

  // Fetch base cost using Supabase function
  const { data: recipeBaseCost } = useQuery({
    queryKey: ["recipeBaseCost", selectedRecipe?.id],
    queryFn: async () => {
      if (!selectedRecipe?.id) return 0;
      const { data, error } = await supabase.rpc('calculate_recipe_base_cost', { recipe_id_param: selectedRecipe.id });
      if (error) {
        console.error("Error fetching recipe base cost:", error);
        return 0;
      }
      return data as number;
    },
    enabled: !!selectedRecipe?.id,
  });

  // Fetch unit cost using Supabase function
  const { data: recipeUnitCost } = useQuery({
    queryKey: ["recipeUnitCost", selectedRecipe?.id],
    queryFn: async () => {
      if (!selectedRecipe?.id) return 0;
      const { data, error } = await supabase.rpc('calculate_recipe_unit_cost', { recipe_id_param: selectedRecipe.id });
      if (error) {
        console.error("Error fetching recipe unit cost:", error);
        return 0;
      }
      return data as number;
    },
    enabled: !!selectedRecipe?.id,
  });

  const efficiency = selectedRecipe?.efficiency || 1;

  const formatCurrency = (value: number) => {
    if (value < 0.01) return "< 0,01";
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
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
                    <TableHead className="text-right w-20">Custo</TableHead>
                    <TableHead className="text-center w-16">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipeItems.length === 0 ? <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum insumo adicionado à receita. Clique em "Adicionar Insumo" para começar.
                      </TableCell>
                    </TableRow> : recipeItems.sort((a, b) => {
                      const itemA = a.item_detail?.description || '';
                      const itemB = b.item_detail?.description || '';
                      return itemA.localeCompare(itemB);
                    }).map(recipeItem => {
                const item = recipeItem.item_detail;
                const unitDescription = item?.unit_use ? getUnitDescription(item.unit_use) : item?.unit_purch ? getUnitDescription(item.unit_purch) : "";
                const unitCost = item?.cost || 0; // custo da unidade de compra
                const factor = item?.factor || 1; // fator de conversão
                const adjustedUnitCost = unitCost / factor; // custo unitario = custo da unidade de compra / fator
                const totalCost = adjustedUnitCost * recipeItem.qty;
                return <TableRow key={`${recipeItem.recipe}-${recipeItem.item}`}>
                          <TableCell className="font-medium">{item?.description}</TableCell>
                          <TableCell className="text-right">{formatQuantity(recipeItem.qty)}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{unitDescription}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-xs">{formatCurrency(totalCost)}</TableCell>
                          <TableCell className="text-center">
                            <ActionButtons
                              onEdit={() => onEditItem(recipeItem)}
                              onDelete={() => deleteRecipeItem(recipeItem.recipe, recipeItem.item)}
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
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>Custo Base:</span>
                  <span>{formatCurrency(recipeBaseCost || 0)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>Rendimento:</span>
                  <span>
                    ({efficiency % 1 !== 0 ? efficiency.toFixed(2) : efficiency.toFixed(0)})
                  </span>
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-lg font-medium">Custo Unitário:</span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(recipeUnitCost || 0)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div> : <p className="text-muted-foreground text-center py-8">
            Selecione uma receita para ver seus insumos
          </p>}
      </CardContent>
    </Card>;
}