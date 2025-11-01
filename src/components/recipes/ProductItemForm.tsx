import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Combobox } from "@/components/ui/combobox"
import { SaveCancelButtons } from "@/components/ui/save-cancel-buttons"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useQueryClient } from "@tanstack/react-query"
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
  const queryClient = useQueryClient()
  const qtyInputRef = useRef<HTMLInputElement>(null)

  // Initialize form when editing
  useEffect(() => {
    if (editingProductItem) {
      setNewProductItem({ 
        item: editingProductItem.item, 
        qty: editingProductItem.qty.toString() 
      })
      // Focus on quantity field when editing
      setTimeout(() => {
        qtyInputRef.current?.focus()
        qtyInputRef.current?.select()
      }, 100)
    } else {
      setNewProductItem({ item: "", qty: "" })
    }
  }, [editingProductItem, isOpen])

  // Focus management - auto focus on quantity when item is selected
  const handleItemChange = (value: string) => {
    setNewProductItem({ ...newProductItem, item: value })
    // Focus on quantity field after item selection
    setTimeout(() => {
      qtyInputRef.current?.focus()
    }, 100)
  }

  const saveProductItem = async () => {
    if (!selectedProduct || !newProductItem.item || !newProductItem.qty) return

    const itemId = newProductItem.item
    
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
        // Invalidate queries to refresh costs
        queryClient.invalidateQueries({ queryKey: ['productBaseCost'] })
        queryClient.invalidateQueries({ queryKey: ['productUnitCost'] })
        // Invalidate event queries to refresh costs when recipe items change
        queryClient.invalidateQueries({ queryKey: ["events"] })
        queryClient.invalidateQueries({ queryKey: ["dashboard-events"] })
        queryClient.invalidateQueries({ queryKey: ["event-menu"] })
        onSuccess()
      }
    } else {
      // Check if item already exists in product (only for new items)
      const itemAlreadyExists = productItems.some(productItem => productItem.item === newProductItem.item)
      
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
        // Invalidate queries to refresh costs
        queryClient.invalidateQueries({ queryKey: ['productBaseCost'] })
        queryClient.invalidateQueries({ queryKey: ['productUnitCost'] })
        // Invalidate event queries to refresh costs when recipe items change
        queryClient.invalidateQueries({ queryKey: ["events"] })
        queryClient.invalidateQueries({ queryKey: ["dashboard-events"] })
        queryClient.invalidateQueries({ queryKey: ["event-menu"] })
        onSuccess()
      }
    }
  }

  const handleClose = () => {
    setNewProductItem({ item: "", qty: "" })
    onOpenChange(false)
  }

  // Validation for Save button
  const isFormValid = newProductItem.item && newProductItem.qty && parseFloat(newProductItem.qty) > 0

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingProductItem ? 'Editar Insumo do Produto' : 'Adicionar Insumo ao Produto'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="item-select">Item</Label>
            <Combobox
              options={items.map((item) => ({
                value: item.id,
                label: item.description
              }))}
              value={newProductItem.item}
              onValueChange={handleItemChange}
              placeholder="Selecione um insumo"
              searchPlaceholder="Buscar insumos..."
              emptyText="Nenhum insumo encontrado."
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="qty-input">Quantidade</Label>
            <Input
              ref={qtyInputRef}
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
            disabled={!isFormValid}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}