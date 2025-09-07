import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SaveCancelButtons } from "@/components/ui/save-cancel-buttons"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import type { Product, Item, ProductItem } from "@/types/recipe"

interface ProductItemFormProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  selectedProduct: Product | null
  items: Item[]
  productItems: ProductItem[]
  editingProductItem?: ProductItem | null
  onSuccess: () => void
}

export default function ProductItemForm({ 
  isOpen, 
  onOpenChange, 
  selectedProduct, 
  items, 
  productItems, 
  editingProductItem,
  onSuccess 
}: ProductItemFormProps) {
  const [newProductItem, setNewProductItem] = useState({ item: "", qty: "" })
  const { toast } = useToast()

  // Initialize form when editing
  useEffect(() => {
    if (editingProductItem) {
      setNewProductItem({ 
        item: editingProductItem.item.toString(), 
        qty: editingProductItem.qty.toString() 
      })
    } else {
      setNewProductItem({ item: "", qty: "1" })
    }
  }, [editingProductItem, isOpen])

  const saveProductItem = async () => {
    if (!selectedProduct || !newProductItem.item || !newProductItem.qty) return

    const itemId = parseInt(newProductItem.item)
    
    if (editingProductItem) {
      // Update existing product item
      const { error } = await supabase
        .from("recipe_item")
        .update({
          item: itemId,
          qty: parseFloat(newProductItem.qty)
        })
        .eq("recipe", editingProductItem.product)
        .eq("item", editingProductItem.item)

      if (error) {
        toast({ title: "Erro", description: "Erro ao atualizar item", variant: "destructive" })
      } else {
        toast({ title: "Insumo atualizado com sucesso" })
        setNewProductItem({ item: "", qty: "" })
        onOpenChange(false)
        onSuccess()
      }
    } else {
      // Check if item already exists in product (only for new items)
      const itemAlreadyExists = productItems.some(productItem => productItem.item === itemId)
      
      if (itemAlreadyExists) {
        toast({ 
          title: "Erro", 
          description: "Este item já foi adicionado ao produto", 
          variant: "destructive" 
        })
        return
      }

      // Create new product item
      const { error } = await supabase
        .from("recipe_item")
        .insert([{
          recipe: selectedProduct.id,
          item: itemId,
          qty: parseFloat(newProductItem.qty)
        }])

      if (error) {
        toast({ title: "Erro", description: "Erro ao adicionar insumo", variant: "destructive" })
      } else {
        toast({ title: "Sucesso", description: "Insumo adicionado com sucesso" })
        setNewProductItem({ item: "", qty: "" })
        onOpenChange(false)
        onSuccess()
      }
    }
  }

  const handleClose = () => {
    setNewProductItem({ item: "", qty: "" })
    onOpenChange(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingProductItem ? 'Editar Insumo do Produto' : 'Adicionar Insumo ao Produto'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="item-select">Item</Label>
            <Select 
              value={newProductItem.item} 
              onValueChange={(value) => setNewProductItem({ ...newProductItem, item: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um insumo" />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.id} value={item.id.toString()}>
                    {item.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="qty-input">Quantidade</Label>
            <Input
              id="qty-input"
              type="number"
              step="0.001"
              value={newProductItem.qty}
              onChange={(e) => setNewProductItem({ ...newProductItem, qty: e.target.value })}
              placeholder="Digite a quantidade..."
            />
          </div>
          <SaveCancelButtons
            onSave={saveProductItem}
            onCancel={handleClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}