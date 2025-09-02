import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ChefHat, Eye } from "lucide-react";
import { CalendarIntegration } from "./CalendarIntegration";

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

interface EventMenuRecipe {
  recipe: {
    id: number;
    description: string;
    cost?: number;
  };
}

interface Recipe {
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
  const [isRecipeItemsDialogOpen, setIsRecipeItemsDialogOpen] = useState(false);
  const [selectedRecipeForItems, setSelectedRecipeForItems] = useState<Recipe | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch event menu recipes
  const { data: eventMenuRecipes, isLoading: isLoadingMenu } = useQuery({
    queryKey: ["event-menu", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_menu")
        .select(`
          recipe:recipe(id, description),
          recipe_cost:recipe(id)
        `)
        .eq("event", eventId);
      
      if (error) throw error;
      
      // Calculate cost for each recipe
      const recipesWithCost = await Promise.all(
        data.map(async (item) => {
          const { data: recipeItems } = await supabase
            .from("recipe_item")
            .select(`
              qty,
              item_detail:item(cost, factor)
            `)
            .eq("recipe", item.recipe.id);
          
          const { data: recipeData } = await supabase
            .from("recipe")
            .select("efficiency")
            .eq("id", item.recipe.id)
            .single();
          
          const baseCost = recipeItems?.reduce((total, recipeItem) => {
            const itemCost = Number(recipeItem.item_detail?.cost || 0);
            const factor = Number(recipeItem.item_detail?.factor || 1);
            const adjustedUnitCost = itemCost / factor;
            const itemTotalCost = adjustedUnitCost * Number(recipeItem.qty);
            return total + itemTotalCost;
          }, 0) || 0;
          
          const efficiency = recipeData?.efficiency || 1.00;
          const totalCost = baseCost * efficiency;
          
          return {
            recipe: {
              ...item.recipe,
              cost: totalCost
            }
          };
        })
      );
      
      return recipesWithCost as EventMenuRecipe[];
    }
  });

  // Fetch all available recipes
  const { data: allRecipes } = useQuery({
    queryKey: ["recipes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipe")
        .select("*")
        .order("description");
      
      if (error) throw error;
      return data as Recipe[];
    }
  });

  // Fetch recipe items for selected recipe
  const { data: recipeItems } = useQuery({
    queryKey: ["recipe-items", selectedRecipeForItems?.id],
    queryFn: async () => {
      if (!selectedRecipeForItems) return [];
      
      const { data, error } = await supabase
        .from("recipe_item")
        .select(`
          *,
          item_detail:item(*)
        `)
        .eq("recipe", selectedRecipeForItems.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedRecipeForItems
  });

  // Fetch units for recipe items display
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

  // Add recipe to event menu mutation
  const addRecipeMutation = useMutation({
    mutationFn: async (recipeId: number) => {
      const { data, error } = await supabase
        .from("event_menu")
        .insert([{ event: eventId, recipe: recipeId }])
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-menu", eventId] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast({
        title: "Receita adicionada",
        description: "Receita adicionada ao menu do evento."
      });
      setIsAddDialogOpen(false);
      setSelectedRecipeId("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: "Erro ao adicionar receita: " + error.message,
        variant: "destructive"
      });
    }
  });

  // Remove recipe from event menu mutation
  const removeRecipeMutation = useMutation({
    mutationFn: async (recipeId: number) => {
      const { error } = await supabase
        .from("event_menu")
        .delete()
        .eq("event", eventId)
        .eq("recipe", recipeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-menu", eventId] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast({
        title: "Receita removida",
        description: "Receita removida do menu do evento."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: "Erro ao remover receita: " + error.message,
        variant: "destructive"
      });
    }
  });

  const handleAddRecipe = () => {
    if (!selectedRecipeId) {
      toast({
        title: "Erro",
        description: "Selecione uma receita para adicionar.",
        variant: "destructive"
      });
      return;
    }
    addRecipeMutation.mutate(parseInt(selectedRecipeId));
  };

  const handleRemoveRecipe = (recipeId: number) => {
    removeRecipeMutation.mutate(recipeId);
  };

  const handleViewRecipeItems = (recipe: Recipe) => {
    setSelectedRecipeForItems(recipe);
    setIsRecipeItemsDialogOpen(true);
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

  // Filter out recipes that are already in the event menu
  const addedRecipeIds = eventMenuRecipes?.map(item => item.recipe.id) || [];
  const availableRecipes = allRecipes?.filter(recipe => !addedRecipeIds.includes(recipe.id)) || [];

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
              Adicionar Receita
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-effect">
            <DialogHeader>
              <DialogTitle>Adicionar Receita ao Menu</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Select value={selectedRecipeId} onValueChange={setSelectedRecipeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma receita" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRecipes.map((recipe) => (
                      <SelectItem key={recipe.id} value={recipe.id.toString()}>
                        {recipe.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleAddRecipe} 
                  disabled={addRecipeMutation.isPending || !selectedRecipeId}
                  className="flex-1"
                >
                  {addRecipeMutation.isPending ? "Adicionando..." : "Adicionar"}
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

      {/* Menu Recipes Grid */}
      {isLoadingMenu ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : eventMenuRecipes && eventMenuRecipes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {eventMenuRecipes.map((item) => (
            <Card key={item.recipe.id} className="gradient-card hover-lift shadow-card border-0 group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors flex items-center gap-2">
                      <ChefHat className="h-4 w-4 text-primary" />
                      {item.recipe.description}
                      {item.recipe.cost !== undefined && (
                        <span className="text-sm font-normal text-muted-foreground">
                          (R$ {formatCurrencyBrazilian(item.recipe.cost)})
                        </span>
                      )}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewRecipeItems(item.recipe)}
                    className="flex-1"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Visualizar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemoveRecipe(item.recipe.id)}
                    disabled={removeRecipeMutation.isPending}
                    className="flex-1 hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Remover
                  </Button>
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
              Nenhuma receita no menu
            </p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Comece adicionando receitas ao menu do evento
            </p>
          </div>
          <Button 
            onClick={() => setIsAddDialogOpen(true)} 
            variant="outline" 
            className="mt-6 hover-lift shadow-button"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Primeira Receita
          </Button>
        </div>
      )}

      {availableRecipes.length === 0 && eventMenuRecipes && eventMenuRecipes.length > 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Todas as receitas disponíveis já foram adicionadas ao menu.
          </p>
        </div>
      )}

      {/* Recipe Items Dialog */}
      <Dialog open={isRecipeItemsDialogOpen} onOpenChange={setIsRecipeItemsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-effect">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Itens da Receita: {selectedRecipeForItems?.description}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {recipeItems && recipeItems.length > 0 ? (
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
                      {recipeItems
                        .sort((a, b) => {
                          const itemA = a.item_detail?.description || '';
                          const itemB = b.item_detail?.description || '';
                          return itemA.localeCompare(itemB);
                        })
                        .map((recipeItem) => {
                          const item = recipeItem.item_detail;
                          const unitDescription = item?.unit_use ? getUnitDescription(item.unit_use) : item?.unit_purch ? getUnitDescription(item.unit_purch) : "";
                          const unitCost = item?.cost || 0;
                          const factor = item?.factor || 1;
                          const adjustedUnitCost = unitCost / factor;
                          const totalCost = adjustedUnitCost * recipeItem.qty;
                          
                          return (
                            <TableRow key={`${recipeItem.recipe}-${recipeItem.item}`}>
                              <TableCell className="font-medium">{item?.description}</TableCell>
                              <TableCell className="text-right">{formatQuantity(recipeItem.qty)}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline">{unitDescription}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium text-xs">R$ {formatCurrency(totalCost)}</TableCell>
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
                      <span className="text-lg font-medium">Custo Total:</span>
                      <span className="text-xl font-bold text-primary">
                        R$ {formatCurrency(
                          recipeItems.reduce((total, recipeItem) => {
                            const item = recipeItem.item_detail;
                            const unitCost = Number(item?.cost || 0);
                            const factor = Number(item?.factor || 1);
                            const adjustedUnitCost = unitCost / factor;
                            const itemTotalCost = adjustedUnitCost * Number(recipeItem.qty);
                            return total + itemTotalCost;
                          }, 0) * (selectedRecipeForItems?.efficiency || 1.00)
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Esta receita não possui itens cadastrados.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};