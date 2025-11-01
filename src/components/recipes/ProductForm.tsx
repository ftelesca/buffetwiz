import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SaveCancelButtons } from "@/components/ui/save-cancel-buttons"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import type { Product } from "@/types/recipe"

interface ProductFormProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (newProductId?: string) => void
}

export default function ProductForm({ isOpen, onOpenChange, onSuccess }: ProductFormProps) {
  const [newProduct, setNewProduct] = useState({ description: "", efficiency: "1.00" })
  const { toast } = useToast()
  const { user } = useAuth()

  const addProduct = async () => {
    if (!newProduct.description.trim()) return

    const efficiency = parseFloat(newProduct.efficiency) || 1.00

    const { data, error } = await supabase
      .from("recipe")
      .insert([{ description: newProduct.description, efficiency: efficiency, user_id: user?.id }])
      .select()

    if (error) {
      toast({ title: "Erro", description: "Erro ao criar produto", variant: "destructive" })
    } else {
      toast({ title: "Produto criado com sucesso" })
      setNewProduct({ description: "", efficiency: "1.00" })
      onOpenChange(false)
      onSuccess(data?.[0]?.id)
    }
  }

  const handleClose = () => {
    setNewProduct({ description: "", efficiency: "1.00" })
    onOpenChange(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Produto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="product-description">Descrição</Label>
            <Textarea
              id="product-description"
              value={newProduct.description}
              onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
              placeholder="Digite a descrição do produto..."
            />
          </div>
          <div>
            <Label htmlFor="product-efficiency">Rendimento</Label>
            <Input
              id="product-efficiency"
              type="number"
              step="0.01"
              min="0.01"
              value={newProduct.efficiency}
              onChange={(e) => setNewProduct({ ...newProduct, efficiency: e.target.value })}
              placeholder="1.00"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Fator de rendimento do produto (ex: 1.20 = 20% a mais de rendimento)
            </p>
          </div>
          <SaveCancelButtons
            onSave={addProduct}
            onCancel={handleClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}