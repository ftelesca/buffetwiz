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
import { CalendarIntegration } from "./CalendarIntegration";
import { ActionButtons } from "@/components/ui/action-buttons";
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
  const [selectedQty, setSelectedQty] = useState<string>("1");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch event menu products with calculated unit costs
  const { data: eventMenuProducts, isLoading: isLoadingMenu } = useQuery({
    queryKey: ["event-menu", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_menu")
        .select(`
          *,
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
      queryClient.invalidateQueries({ queryKey: ["event-menu", eventId] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast({
        title: "Produto adicionado",
        description: "Produto adicionado ao menu do evento."
      });
      setIsAddDialogOpen(false);
      setSelectedProductId("");
      setSelectedQty("1");
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
      queryClient.invalidateQueries({ queryKey: ["event-menu", eventId] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
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
      queryClient.invalidateQueries({ queryKey: ["event-menu", eventId] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
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
          {eventDate && (
            <div className="flex items-center gap-4 mt-3">
              <CalendarIntegration 
                event={{
                  title: eventTitle,
                  client: customerName,
                  description: eventDescription,
                  location: eventLocation,
                  startDate: eventDate || "",
                  startTime: eventTime || undefined,
                  duration: eventDuration
                }}
                variant="outline"
                size="sm"
              />
            </div>
          )}
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-button hover-glow">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-effect">
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
                  placeholder="1"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleAddProduct} 
                  disabled={addProductMutation.isPending || !selectedProductId}
                  className="flex-1"
                >
                  {addProductMutation.isPending ? "Adicionando..." : "Adicionar"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Menu Products Grid */}
      {isLoadingMenu ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : eventMenuProducts && eventMenuProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {eventMenuProducts.map((item) => (
            <Card key={item.product.id} className="gradient-card hover-lift shadow-card border-0 group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors flex items-center gap-2">
                      <ChefHat className="h-4 w-4 text-primary" />
                      {item.product.description}
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                      {item.qty} x {formatCurrency(item.product.unit_cost || 0)} = {formatCurrency((item.qty * (item.product.unit_cost || 0)))}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewProductItems(item)}
                    className="flex-none w-24"
                  >
                    <Eye className="h-3 w-3 mr-1" />
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
        <div className="text-center py-16 space-y-4">
          <div className="w-16 h-16 rounded-full bg-accent/30 flex items-center justify-center mx-auto">
            <ChefHat className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-muted-foreground text-lg font-medium">
              Nenhum produto no menu
            </p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Comece adicionando produtos ao menu do evento
            </p>
          </div>
          <Button 
            onClick={() => setIsAddDialogOpen(true)} 
            variant="outline" 
            className="mt-6 hover-lift shadow-button"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Primeiro Produto
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
        <DialogContent className="glass-effect">
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-effect">
          <DialogHeader>
            <DialogTitle className="text-2xl">
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