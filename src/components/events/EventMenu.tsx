import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Combobox } from "@/components/ui/combobox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, ChefHat, Eye } from "lucide-react";
import { ActionButtons } from "@/components/ui/action-buttons";
import { SaveCancelButtons } from "@/components/ui/save-cancel-buttons";
import { EventMenuItemForm } from "./EventMenuItemForm";

// Helper function to format currency with thousands separator
const formatCurrencyBrazilian = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

interface EventMenuProps {
  eventId: number;
  eventTitle: string;
  eventDescription?: string;
  customerName?: string;
  eventDate?: string | null;
  eventTime?: string | null;
  eventDuration?: number | null;
  eventLocation?: string | null;
}

interface EventMenuProduct {
  qty: number;
  produced?: boolean | null;
  product: {
    id: number;
    description: string;
    unit_cost?: number;
  };
}

interface Product {
  id: number;
  description: string;
}

export const EventMenu = ({ 
  eventId, 
  eventTitle, 
  eventDescription, 
  customerName,
  eventDate,
  eventTime,
  eventDuration,
  eventLocation 
}: EventMenuProps) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isProductItemsDialogOpen, setIsProductItemsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedProductForItems, setSelectedProductForItems] = useState<{ product: Product; qty: number; unit_cost: number } | null>(null);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<EventMenuProduct | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedQty, setSelectedQty] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch event menu products with calculated unit costs
  const { data: eventMenuProducts, isLoading: isLoadingMenu } = useQuery({
    queryKey: ["event-menu", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_menu")
        .select(`
          qty,
          produced,
          product:recipe(id, description)
        `)
        .eq("event", eventId);
      
      if (error) throw error;
      
      // Calculate unit cost for each product
      const productsWithCost = await Promise.all(
        data.map(async (item: any) => {
          const { data: unitCost, error: costError } = await supabase
            .rpc('calculate_recipe_unit_cost' as any, {
              recipe_id_param: item.product.id
            });
          
          if (costError) {
            console.error('Error calculating product cost:', costError);
          }
          
          return {
            qty: item.qty || 1,
            produced: item.produced,
            product: {
              ...item.product,
              unit_cost: unitCost || 0
            }
          };
        })
      );
      
      return productsWithCost as EventMenuProduct[];
    }
  });

  // Fetch product unit cost for the selected product
  const { data: productUnitCost, isLoading: isLoadingCost } = useQuery({
    queryKey: ["product-unit-cost", selectedProductForItems?.product.id],
    queryFn: async () => {
      if (!selectedProductForItems?.product.id) return 0;
      
      const { data, error } = await supabase
        .rpc('calculate_recipe_unit_cost' as any, {
          recipe_id_param: selectedProductForItems.product.id
        });
      
      if (error) throw error;
      return data || 0;
    },
    enabled: !!selectedProductForItems?.product.id,
  });

  // Fetch all available products
  const { data: allProducts } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipe")
        .select("*")
        .order("description");
      
      if (error) throw error;
      return data as Product[];
    }
  });

  // Fetch product items for selected product
  const { data: productItems } = useQuery({
    queryKey: ["product-items", selectedProductForItems?.product.id],
    queryFn: async () => {
      if (!selectedProductForItems) return [];
      
      const { data, error } = await supabase
        .from("recipe_item")
        .select(`
          *,
          item_detail:item(*)
        `)
        .eq("recipe", selectedProductForItems.product.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProductForItems
  });

  // Fetch units for product items display
  const { data: units } = useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unit")
        .select("*")
        .order("description");
      
      if (error) throw error;
      return data;
    }
  });

  // Add product to event menu mutation
  const addProductMutation = useMutation({
    mutationFn: async ({ productId, qty }: { productId: number; qty: number }) => {
      const { data, error } = await supabase
        .from("event_menu")
        .insert([{ 
          event: eventId, 
          recipe: productId, 
          qty: qty 
        } as any])
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Force refresh of all event-related queries
      queryClient.refetchQueries({ queryKey: ["event-menu", eventId] });
      queryClient.refetchQueries({ queryKey: ["events"] });
      queryClient.refetchQueries({ queryKey: ["dashboard-events"] });
      toast({
        title: "Produto adicionado",
        description: "Produto adicionado ao menu do evento."
      });
      setIsAddDialogOpen(false);
      setSelectedProductId("");
      setSelectedQty("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: "Erro ao adicionar produto: " + error.message,
        variant: "destructive"
      });
    }
  });

  // Remove product from event menu mutation
  const removeProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      const { error } = await supabase
        .from("event_menu")
        .delete()
        .eq("event", eventId)
        .eq("recipe", productId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      // Force refresh of all event-related queries
      queryClient.refetchQueries({ queryKey: ["event-menu", eventId] });
      queryClient.refetchQueries({ queryKey: ["events"] });
      queryClient.refetchQueries({ queryKey: ["dashboard-events"] });
      toast({
        title: "Produto removido",
        description: "Produto removido do menu do evento."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: "Erro ao remover produto: " + error.message,
        variant: "destructive"
      });
    }
  });

  // Update product quantity mutation
  const updateProductMutation = useMutation({
    mutationFn: async ({ productId, qty }: { productId: number; qty: number }) => {
      const { data, error } = await supabase
        .from("event_menu")
        .update({ qty: qty } as any)
        .eq("event", eventId)
        .eq("recipe", productId)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Force refresh of all event-related queries
      queryClient.refetchQueries({ queryKey: ["event-menu", eventId] });
      queryClient.refetchQueries({ queryKey: ["events"] });
      queryClient.refetchQueries({ queryKey: ["dashboard-events"] });
      setIsEditDialogOpen(false);
      setSelectedProductForEdit(null);
      toast({
        title: "Quantidade do produto atualizada",
        description: "Quantidade do produto atualizada com sucesso."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar produto: " + error.message,
        variant: "destructive"
      });
    }
  });

  // Toggle produced status mutation
  const toggleProducedMutation = useMutation({
    mutationFn: async ({ productId, currentProduced }: { productId: number; currentProduced?: boolean | null }) => {
      // Toggle logic: null/false -> true -> false -> true...
      const nextProduced = currentProduced === true ? false : true;
      
      const { data, error } = await supabase
        .from("event_menu")
        .update({ produced: nextProduced } as any)
        .eq("event", eventId)
        .eq("recipe", productId)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["event-menu", eventId] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar status: " + error.message,
        variant: "destructive"
      });
    }
  });

  const handleAddProduct = () => {
    if (!selectedProductId) {
      toast({
        title: "Erro",
        description: "Selecione um produto para adicionar.",
        variant: "destructive"
      });
      return;
    }
    
    const qty = parseFloat(selectedQty) || 1;
    if (qty <= 0) {
      toast({
        title: "Erro",
        description: "Quantidade deve ser maior que zero.",
        variant: "destructive"
      });
      return;
    }
    
    addProductMutation.mutate({ productId: parseInt(selectedProductId), qty });
  };

  const handleRemoveProduct = (productId: number) => {
    removeProductMutation.mutate(productId);
  };

  const handleViewProductItems = (menuItem: EventMenuProduct) => {
    setSelectedProductForItems({
      product: menuItem.product,
      qty: menuItem.qty,
      unit_cost: menuItem.product.unit_cost || 0
    });
    setIsProductItemsDialogOpen(true);
  };

  const handleEditProduct = (menuItem: EventMenuProduct) => {
    setSelectedProductForEdit(menuItem);
    setIsEditDialogOpen(true);
  };

  const handleUpdateProduct = (qty: number) => {
    if (selectedProductForEdit) {
      updateProductMutation.mutate({ 
        productId: selectedProductForEdit.product.id, 
        qty 
      });
    }
  };

  const handleToggleProduced = (productId: number, currentProduced?: boolean | null) => {
    toggleProducedMutation.mutate({ productId, currentProduced });
  };

  const getUnitDescription = (unitId: number) => {
    const unit = units?.find(u => u.id === unitId);
    return unit?.description || "";
  };

  const formatQuantity = (qty: number) => {
    return qty.toString().replace('.', ',');
  };

  const formatCurrency = (value: number) => {
    if (value < 0.01) return "< 0,01";
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Filter out products that are already in the event menu
  const addedProductIds = eventMenuProducts?.map(item => item.product.id) || [];
  const availableProducts = allProducts?.filter(product => !addedProductIds.includes(product.id)) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">{eventTitle}</h2>
          <p className="text-muted-foreground font-medium">{customerName}</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Produto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Produto ao Menu</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="product-select">Produto</Label>
                <Combobox
                  options={availableProducts.map((product) => ({
                    value: product.id.toString(),
                    label: product.description
                  }))}
                  value={selectedProductId}
                  onValueChange={setSelectedProductId}
                  placeholder="Selecione um produto"
                  searchPlaceholder="Buscar produtos..."
                  emptyText="Nenhum produto encontrado."
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="qty-input">Quantidade</Label>
                <Input
                  id="qty-input"
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={selectedQty}
                  onChange={(e) => setSelectedQty(e.target.value)}
                  placeholder="Digite a quantidade..."
                />
              </div>
              <div className="pt-4">
                <SaveCancelButtons
                  onSave={handleAddProduct}
                  onCancel={() => setIsAddDialogOpen(false)}
                  isLoading={addProductMutation.isPending}
                  disabled={!selectedProductId || !selectedQty}
                  saveLabel={addProductMutation.isPending ? "Salvando..." : "Salvar"}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Total Cost Display */}
      {eventMenuProducts && eventMenuProducts.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <p className="text-lg font-semibold">
            Custo Total: {formatCurrencyBrazilian(
              eventMenuProducts.reduce(
                (total, item) => total + (item.qty * (item.product.unit_cost || 0)), 
                0
              )
            )}
          </p>
        </div>
      )}

      {/* Menu Products Grid */}
      {isLoadingMenu ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : eventMenuProducts && eventMenuProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {eventMenuProducts.map((item) => (
            <Card key={item.product.id}>
              <CardHeader className="pb-3 text-center">
                <div className="space-y-1">
                  <div 
                    className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      item.produced === true 
                        ? 'bg-green-200 hover:bg-green-300 dark:bg-green-800 dark:hover:bg-green-700' 
                        : 'bg-red-200 hover:bg-red-300 dark:bg-red-800 dark:hover:bg-red-700'
                    }`}
                    onClick={() => handleToggleProduced(item.product.id, item.produced)}
                  >
                    <CardTitle className="text-lg">
                      {item.product.description}
                    </CardTitle>
                  </div>
                  <CardDescription>
                    {item.qty} x {formatCurrency(item.product.unit_cost || 0)} = {formatCurrency((item.qty * (item.product.unit_cost || 0)))}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-0 text-center">
                <div className="flex gap-2 justify-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewProductItems(item)}
                    className="flex-none"
                  >
                    Ver
                  </Button>
                  <div className="flex-none">
                    <ActionButtons
                      onEdit={() => handleEditProduct(item)}
                      onDelete={() => handleRemoveProduct(item.product.id)}
                      itemName={item.product.description}
                      itemType="produto"
                      isDeleting={removeProductMutation.isPending}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Nenhum produto no menu
          </p>
          <Button 
            onClick={() => setIsAddDialogOpen(true)} 
            variant="outline" 
            className="mt-4"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar primeiro produto
          </Button>
        </div>
      )}

      {availableProducts.length === 0 && eventMenuProducts && eventMenuProducts.length > 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Todos os produtos disponíveis já foram adicionados ao menu.
          </p>
        </div>
      )}

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Produto no Menu</DialogTitle>
          </DialogHeader>
          {selectedProductForEdit && (
            <EventMenuItemForm
              initialQty={selectedProductForEdit.qty}
              productName={selectedProductForEdit.product.description}
              onSave={handleUpdateProduct}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setSelectedProductForEdit(null);
              }}
              isLoading={updateProductMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Product Items Dialog */}
      <Dialog open={isProductItemsDialogOpen} onOpenChange={setIsProductItemsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Itens do Produto: {selectedProductForItems?.product.description}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {productItems && productItems.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Quantidade</TableHead>
                        <TableHead className="text-center">Unidade</TableHead>
                        <TableHead className="text-right w-20">Custo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productItems
                        .sort((a, b) => {
                          const itemA = a.item_detail?.description || '';
                          const itemB = b.item_detail?.description || '';
                          return itemA.localeCompare(itemB);
                        })
                        .map((productItem) => {
                          const item = productItem.item_detail;
                          const unitDescription = item?.unit_use ? getUnitDescription(item.unit_use) : item?.unit_purch ? getUnitDescription(item.unit_purch) : "";
                          const unitCost = item?.cost || 0;
                          const factor = item?.factor || 1;
                          const adjustedUnitCost = unitCost / factor;
                          const totalCost = adjustedUnitCost * productItem.qty;
                          
                          return (
                            <TableRow key={`${productItem.recipe}-${productItem.item}`}>
                              <TableCell className="font-medium">{item?.description}</TableCell>
                              <TableCell className="text-right">{formatQuantity(productItem.qty)}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline">{unitDescription}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium text-xs">{formatCurrency(totalCost)}</TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>

                {/* Total Cost Card */}
                <Card className="mt-4">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Custo Unitário do Produto:</span>
                      <span className="text-lg font-semibold">
                        {isLoadingCost ? "Calculando..." : formatCurrency(productUnitCost || 0)}
                      </span>
                    </div>
                    {selectedProductForItems && (
                      <div className="flex justify-between items-center mt-2 pt-2 border-t">
                        <span className="text-lg font-medium">
                          Custo Total ({selectedProductForItems.qty} unidades):
                        </span>
                        <span className="text-xl font-bold text-primary">
                          {formatCurrency((productUnitCost || 0) * selectedProductForItems.qty)}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Este produto não possui itens cadastrados.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};