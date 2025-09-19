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
import type { Product, ProductItem, Unit } from "@/types/recipe";
interface ProductItemsProps {
  selectedProduct: Product | null;
  productItems: ProductItem[];
  units: Unit[];
  onAddItem: () => void;
  onEditItem: (productItem: ProductItem) => void;
  onProductItemsChange: () => void;
}
export default function ProductItems({
  selectedProduct,
  productItems,
  units,
  onAddItem,
  onEditItem,
  onProductItemsChange
}: ProductItemsProps) {
  const {
    toast
  } = useToast();
  const deleteProductItem = async (product: number, item: number) => {
    const {
      error
    } = await supabase.from("recipe_item").delete().eq("recipe", product).eq("item", item);
    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir item",
        variant: "destructive"
      });
    } else {
      toast({ title: getDeletedMessage("item", "m") });
      onProductItemsChange();
    }
  };
  const getUnitDescription = (unitId: number) => {
    const unit = units.find(u => u.id === unitId);
    return unit?.description || "";
  };
  const formatQuantity = (qty: number) => {
    return qty.toString().replace('.', ',');
  };

  // Calculate base cost using Supabase function
  const { data: productBaseCost } = useQuery({
    queryKey: ["productBaseCost", selectedProduct?.id, selectedProduct?.efficiency, productItems.length, productItems.map(item => `${item.item}-${item.qty}`).join(',')],
    queryFn: async () => {
      if (!selectedProduct?.id) return 0;
      
      const { data, error } = await supabase
        .rpc('calculate_recipe_base_cost' as any, {
          recipe_id_param: selectedProduct.id
        });
      
      if (error) {
        console.error('Error calculating product base cost:', error);
        return 0;
      }
      
      return data || 0;
    },
    enabled: !!selectedProduct?.id,
  });

  // Calculate unit cost using Supabase function
  const { data: productUnitCost } = useQuery({
    queryKey: ["productUnitCost", selectedProduct?.id, selectedProduct?.efficiency, productItems.length, productItems.map(item => `${item.item}-${item.qty}`).join(',')],
    queryFn: async () => {
      if (!selectedProduct?.id) return 0;
      
      const { data, error } = await supabase
        .rpc('calculate_recipe_unit_cost' as any, {
          recipe_id_param: selectedProduct.id
        });
      
      if (error) {
        console.error('Error calculating product unit cost:', error);
        return 0;
      }
      
      return data || 0;
    },
    enabled: !!selectedProduct?.id,
  });

  const efficiency = selectedProduct?.efficiency || 1;

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
            {selectedProduct ? "Insumos do Produto" : "Selecione um produto"}
          </CardTitle>
          {selectedProduct && !productItems.some(item => item.item_detail?.isproduct) && <Button onClick={onAddItem} size="sm" className="flex-shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Insumo
            </Button>}
        </div>
      </CardHeader>
      <CardContent className="overflow-auto max-h-[70vh]">
        {selectedProduct ? <div className="space-y-4">
            <div className="overflow-x-auto">
              <Table className="table-fixed">
                <TableHeader className="sticky top-0 bg-background z-10 border-b">
                  <TableRow>
                    <TableHead className="w-[40%] whitespace-nowrap">Insumo</TableHead>
                    <TableHead className="text-right w-[15%] whitespace-nowrap">Qtd.</TableHead>
                    <TableHead className="text-center w-[15%] whitespace-nowrap">Unidade</TableHead>
                    <TableHead className="text-right w-[15%] whitespace-nowrap">Custo</TableHead>
                    <TableHead className="text-center w-[15%] whitespace-nowrap">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productItems.length === 0 ? <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum insumo adicionado ao produto. Clique em "Adicionar Insumo" para começar.
                      </TableCell>
                    </TableRow> : productItems.sort((a, b) => {
                      const itemA = a.item_detail?.description || '';
                      const itemB = b.item_detail?.description || '';
                      return itemA.localeCompare(itemB);
                    }).map(productItem => {
                const item = productItem.item_detail;
                const unitDescription = item?.unit_use ? getUnitDescription(item.unit_use) : item?.unit_purch ? getUnitDescription(item.unit_purch) : "";
                const unitCost = item?.cost || 0; // custo da unidade de compra
                const factor = item?.factor || 1; // fator de conversão
                const adjustedUnitCost = unitCost / factor; // custo unitario = custo da unidade de compra / fator
                const totalCost = adjustedUnitCost * productItem.qty;
                return <TableRow key={`${productItem.product}-${productItem.item}`}>
                          <TableCell className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">{item?.description}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">{formatQuantity(productItem.qty)}</TableCell>
                          <TableCell className="text-center whitespace-nowrap">
                            <Badge variant="outline" className="text-xs px-2 py-1">{unitDescription}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-xs whitespace-nowrap">{formatCurrency(totalCost)}</TableCell>
                          <TableCell className="text-center whitespace-nowrap">
                            {item?.isproduct ? (
                              <span className="text-xs text-muted-foreground">Produto automatico</span>
                            ) : (
                              <ActionButtons
                                onEdit={() => onEditItem(productItem)}
                                onDelete={() => deleteProductItem(productItem.product, productItem.item)}
                                itemName={item?.description || "este item"}
                                itemType="este item do produto"
                              />
                            )}
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
                  <span>{formatCurrency(productBaseCost || 0)}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>Rendimento:</span>
                  <span>
                    {efficiency % 1 !== 0 ? efficiency.toFixed(2) : efficiency.toFixed(0)} {efficiency === 1 ? 'unidade' : 'unidades'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-lg font-medium">Custo Unitário do Produto:</span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(productUnitCost || 0)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div> : <p className="text-muted-foreground text-center py-8">
            Selecione um produto para ver seus insumos
          </p>}
      </CardContent>
    </Card>;
}