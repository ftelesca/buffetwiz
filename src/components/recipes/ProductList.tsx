import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseErrorMessage } from "@/utils/errorHandler"
import { Trash2, Edit } from "lucide-react"
import { SaveCancelButtons } from "@/components/ui/save-cancel-buttons"
import { getCountText, getDeletedMessage } from "@/lib/utils"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { ActionButtons } from "@/components/ui/action-buttons"
import type { Product } from "@/types/recipe"

interface ProductListProps {
  products: Product[]
  selectedProduct: Product | null
  onSelectProduct: (product: Product) => void
  onProductsChange: () => void
  allProducts: Product[]
  searchTerm: string
}

export default function ProductList({ products, selectedProduct, onSelectProduct, onProductsChange, allProducts, searchTerm }: ProductListProps) {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingEfficiency, setEditingEfficiency] = useState("")
  const { toast } = useToast()

  const startEdit = (product: Product) => {
    setEditingProduct(product)
    setEditingEfficiency((product.efficiency || 1.00).toString())
  }

  const saveProduct = async () => {
    if (editingProduct) {
      const efficiency = parseFloat(editingEfficiency) || 1.00
      
      const { error } = await supabase
        .from("recipe")
        .update({ description: editingProduct.description, efficiency: efficiency })
        .eq("id", editingProduct.id)

      if (error) {
        toast({ title: "Erro", description: "Erro ao atualizar produto", variant: "destructive" })
      } else {
        toast({ title: "Produto atualizado com sucesso" })
        setEditingProduct(null)
        setEditingEfficiency("")
        onProductsChange()
      }
    }
  }

  const deleteProduct = async (id: number) => {
    const { error } = await supabase
      .from("recipe")
      .delete()
      .eq("id", id)

    if (error) {
      const friendlyError = getSupabaseErrorMessage(error);
      toast({ 
        title: friendlyError.title, 
        description: friendlyError.description, 
        variant: "destructive" 
      });
    } else {
      toast({ title: "Produto excluído com sucesso" })
      onProductsChange()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Produtos</CardTitle>
        <CardDescription>
          {getCountText(
            allProducts.length,
            products.length,
            !!searchTerm,
            "produto",
            "produtos",
            "produto cadastrado",
            "produtos cadastrados",
            "encontrado",
            "encontrados"
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[calc(70vh-80px)] overflow-y-auto scrollbar-thin">
          {products.map((product) => (
            <div
              key={product.id}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedProduct?.id === product.id
                  ? "bg-primary/10 border-primary"
                  : "hover:bg-accent"
              }`}
              onClick={() => onSelectProduct(product)}
            >
              <div className="flex justify-between items-center">
                {editingProduct?.id === product.id ? (
                  <div className="flex-1 flex gap-2">
                    <div className="flex-1 space-y-2">
                      <Input
                        value={editingProduct.description}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            description: e.target.value,
                          })
                        }
                        placeholder="Descrição do produto"
                      />
                      <div className="flex items-center gap-2">
                        <Label htmlFor="efficiency" className="text-xs whitespace-nowrap">Rendimento:</Label>
                        <Input
                          id="efficiency"
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={editingEfficiency}
                          onChange={(e) => setEditingEfficiency(e.target.value)}
                          className="w-20 text-xs"
                          placeholder="1.00"
                        />
                      </div>
                    </div>
                     <SaveCancelButtons
                       onSave={saveProduct}
                       onCancel={() => {
                         setEditingProduct(null)
                         setEditingEfficiency("")
                       }}
                     />
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <span className="font-medium">
                        {product.description}
                        {product.efficiency && (
                          product.efficiency !== 1
                        ) && (
                          <span className="text-muted-foreground font-normal ml-2">
                            ({product.efficiency % 1 !== 0 ? product.efficiency.toFixed(2) : product.efficiency.toFixed(0)})
                          </span>
                        )}
                      </span>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <ActionButtons
                        onEdit={() => startEdit(product)}
                        onDelete={() => deleteProduct(product.id)}
                        itemName={product.description}
                        itemType="o produto"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}