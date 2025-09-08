import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Plus, Edit, Trash2, Mail, Phone, MapPin, Search } from "lucide-react";
import { SaveCancelButtons } from "@/components/ui/save-cancel-buttons";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseErrorMessage } from "@/utils/errorHandler";
import { cn, toTitleCase, getCountText, getDeletedMessage } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ActionButtons } from "@/components/ui/action-buttons"

interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

const Customers = () => {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: ""
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch customers
  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as Customer[];
    }
  });

  // Create customer mutation
  const createMutation = useMutation({
    mutationFn: async (customerData: Omit<Customer, "id">) => {
      const { data, error } = await supabase
        .from("customer")
        .insert([{ ...customerData, user_id: user?.id }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      resetForm();
      setIsDialogOpen(false);
      toast({
        title: "Cliente criado",
        description: "Cliente adicionado com sucesso."
      });
    },
    onError: (error) => {
      const friendlyError = getSupabaseErrorMessage(error);
      toast({
        title: friendlyError.title,
        description: friendlyError.description,
        variant: "destructive"
      });
    }
  });

  // Update customer mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...customerData }: Customer) => {
      const { data, error } = await supabase
        .from("customer")
        .update(customerData)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      resetForm();
      setIsDialogOpen(false);
      setEditingCustomer(null);
      toast({ title: "Cliente atualizado com sucesso" });
    },
    onError: (error) => {
      const friendlyError = getSupabaseErrorMessage(error);
      toast({
        title: friendlyError.title,
        description: friendlyError.description,
        variant: "destructive"
      });
    }
  });

  // Delete customer mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from("customer")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({
        title: getDeletedMessage("cliente", "m")
      });
    },
    onError: (error) => {
      const friendlyError = getSupabaseErrorMessage(error);
      toast({
        title: friendlyError.title,
        description: friendlyError.description,
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: ""
    });
    setEditingCustomer(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || ""
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    if (editingCustomer) {
      updateMutation.mutate({
        ...editingCustomer,
        ...formData,
        name: toTitleCase(formData.name)
      });
    } else {
      createMutation.mutate({
        ...formData,
        name: toTitleCase(formData.name)
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  // Filter customers based on search query
  const filteredCustomers = customers?.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.includes(searchQuery) ||
    customer.address?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="h-8 bg-muted animate-pulse rounded" />
          <div className="h-64 bg-muted animate-pulse rounded" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        subtitle="Gerencie seus clientes e informações de contato"
      >
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? "Editar Cliente" : "Novo Cliente"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome do cliente"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>
              
              <div>
                <Label htmlFor="address">Endereço</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Endereço completo"
                  rows={3}
                />
              </div>
              
              <div className="pt-4">
                <SaveCancelButtons
                  onSave={() => handleSubmit(new Event('submit') as any)}
                  onCancel={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                  isLoading={createMutation.isPending || updateMutation.isPending}
                />
              </div>
            </form>
          </DialogContent>
          </Dialog>
        </PageHeader>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Buscar clientes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clientes</CardTitle>
          <CardDescription>
            {getCountText(
              customers.length,
              filteredCustomers.length,
              !!searchQuery,
              "cliente",
              "clientes",
              "cliente cadastrado",
              "clientes cadastrados"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredCustomers.length > 0 ? (
            <div className="h-[calc(100vh-360px)] overflow-y-auto scrollbar-thin">
              <Table>
              <TableHeader className="sticky top-0 bg-background z-10 border-b">
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">
                      {toTitleCase(customer.name)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {customer.email && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </div>
                        )}
                        {!customer.email && !customer.phone && (
                          <Badge variant="outline">Sem contato</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {customer.address ? (
                        <div className="flex items-start gap-1 text-sm">
                          <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span className="whitespace-pre-wrap">{customer.address}</span>
                        </div>
                      ) : (
                        <Badge variant="outline">Sem endereço</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <ActionButtons
                        onEdit={() => openEditDialog(customer)}
                        onDelete={() => handleDelete(customer.id)}
                        itemName={customer.name}
                        itemType="o cliente"
                        isDeleting={deleteMutation.isPending}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          ) : searchQuery ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum cliente encontrado para "{searchQuery}"</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum cliente cadastrado</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={openCreateDialog}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar primeiro cliente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </MainLayout>
  );
};

export default Customers;