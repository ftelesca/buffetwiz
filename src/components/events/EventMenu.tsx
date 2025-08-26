import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ChefHat } from "lucide-react";

interface EventMenuProps {
  eventId: number;
  eventTitle: string;
  eventDescription?: string;
  customerName?: string;
}

interface EventMenuRecipe {
  recipe: {
    id: number;
    description: string;
  };
}

interface Recipe {
  id: number;
  description: string;
}

export const EventMenu = ({ eventId, eventTitle, eventDescription, customerName }: EventMenuProps) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
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
          recipe:recipe(id, description)
        `)
        .eq("event", eventId);
      
      if (error) throw error;
      return data as EventMenuRecipe[];
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
          {eventDescription && (
            <p className="text-sm text-muted-foreground/80">{eventDescription}</p>
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
                    </CardTitle>
                  </div>
                  <Badge variant="secondary">Receita</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRemoveRecipe(item.recipe.id)}
                  disabled={removeRecipeMutation.isPending}
                  className="w-full hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Remover
                </Button>
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
    </div>
  );
};