import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Plus, Search, Upload } from "lucide-react"

import { PageHeader } from "@/components/ui/page-header"
import ProductList from "@/components/recipes/ProductList"
import ProductItems from "@/components/recipes/ProductItems"
import ProductForm from "@/components/recipes/ProductForm"
import ProductItemForm from "@/components/recipes/ProductItemForm"
import { ProductSpreadsheetImport } from "@/components/recipes/ProductSpreadsheetImport"
import type { Product, Item, Unit, ProductItem } from "@/types/recipe"

export default function Recipes() {
  const [products, setProducts] = useState<Product[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productItems, setProductItems] = useState<ProductItem[]>([])
  const [isAddingProduct, setIsAddingProduct] = useState(false)
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [editingProductItem, setEditingProductItem] = useState<ProductItem | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)

  useEffect(() => {
    fetchProducts()
    fetchItems()
    fetchUnits()
  }, [])

  useEffect(() => {
    if (selectedProduct) {
      fetchProductItems(selectedProduct.id)
    } else {
      setProductItems([])
    }
  }, [selectedProduct])

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("recipe")
      .select("id, description, efficiency")
      .order("description")

    if (error) {
      toast({ title: "Erro", description: "Erro ao carregar produtos", variant: "destructive" })
    } else {
      setProducts(data || [])
    }
  }

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("item")
      .select("*")
      .order("description")

    if (error) {
      toast({ title: "Erro", description: "Erro ao carregar itens", variant: "destructive" })
    } else {
      setItems(data || [])
    }
  }

  const fetchUnits = async () => {
    const { data, error } = await supabase
      .from("unit")
      .select("*")
      .order("description")

    if (error) {
      toast({ title: "Erro", description: "Erro ao carregar unidades", variant: "destructive" })
    } else {
      setUnits(data || [])
    }
  }

  const fetchProductItems = async (productId: string) => {
    const { data, error } = await supabase
      .from("recipe_item")
      .select(`
        *,
        item_detail:item(*)
      `)
      .eq("recipe", productId)

    if (error) {
      toast({ title: "Erro", description: "Erro ao carregar insumos do produto", variant: "destructive" })
    } else {
      // Type-safe filtering of valid items  
      const validItems = (data || []).filter(item => {
        if (!item.item_detail) return false;
        if (typeof item.item_detail !== 'object') return false;
        const detail: any = item.item_detail;
        if ('error' in detail) return false;
        return true;
      });
      const mappedItems = validItems.map(item => ({ 
        ...item, 
        product: productId, 
        recipe: productId,
        item_detail: item.item_detail!
      }));
      setProductItems(mappedItems as unknown as ProductItem[])
    }
  }

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product)
  }

  const handleProductsChange = (newProductId?: string) => {
    fetchProducts().then(() => {
      if (newProductId) {
        // Find and select the newly created product
        supabase
          .from("recipe")
          .select("id, description, efficiency")
          .eq("id", newProductId)
          .single()
          .then(({ data, error }) => {
            if (!error && data) {
              setSelectedProduct(data)
              // Scroll to the product in the list
              setTimeout(() => {
                const productElement = document.querySelector(`[data-product-id="${newProductId}"]`)
                if (productElement) {
                  productElement.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                  })
                }
              }, 100)
            }
          })
      }
    })
    
    // If current selected product was deleted, clear selection
    // If it still exists, update it with latest data (including efficiency changes)
    if (selectedProduct && !newProductId) {
      fetchProducts().then(() => {
        supabase
          .from("recipe")
          .select("id, description, efficiency")
          .eq("id", selectedProduct.id)
          .single()
          .then(({ data, error }) => {
            if (error || !data) {
              setSelectedProduct(null)
            } else {
              setSelectedProduct(data)
            }
          })
      })
    }
  }

  const handleProductItemsChange = () => {
    if (selectedProduct) {
      fetchProductItems(selectedProduct.id)
    }
  }

  const handleEditItem = (productItem: ProductItem) => {
    setEditingProductItem(productItem)
    setIsAddingItem(true)
  }

  const handleAddItem = () => {
    setEditingProductItem(null)
    setIsAddingItem(true)
  }

  const filteredProducts = products.filter(product =>
    product.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-8">
        <PageHeader
          title="Produtos"
          subtitle="Gerencie produtos e seus insumos"
        >
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsImportDialogOpen(true)}
            >
              <Upload className="h-4 w-4" />
              Importar Planilha
            </Button>
            <Button onClick={() => setIsAddingProduct(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Produto
            </Button>
          </div>
        </PageHeader>

        <div className="rounded-2xl border border-border/60 bg-card/85 p-4 shadow-card">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background/70"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border/60 bg-card/90 shadow-card p-4 sm:p-5">
            <ProductList
              products={filteredProducts}
              selectedProduct={selectedProduct}
              onSelectProduct={handleSelectProduct}
              onProductsChange={handleProductsChange}
              allProducts={products}
              searchTerm={searchTerm}
            />
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/90 shadow-card p-4 sm:p-5">
            <ProductItems
              selectedProduct={selectedProduct}
              productItems={productItems}
              units={units}
              onAddItem={handleAddItem}
              onEditItem={handleEditItem}
              onProductItemsChange={handleProductItemsChange}
            />
          </div>
        </div>

        <ProductForm
          isOpen={isAddingProduct}
          onOpenChange={setIsAddingProduct}
          onSuccess={handleProductsChange}
        />

        <ProductItemForm
          isOpen={isAddingItem}
          onOpenChange={(open) => {
            setIsAddingItem(open)
            if (!open) setEditingProductItem(null)
          }}
          selectedProduct={selectedProduct}
          items={items}
          productItems={productItems}
          editingProductItem={editingProductItem}
          onSuccess={handleProductItemsChange}
        />

        <ProductSpreadsheetImport
          isOpen={isImportDialogOpen}
          onClose={() => setIsImportDialogOpen(false)}
          onImportComplete={() => {
            fetchProducts()
            if (selectedProduct) {
              fetchProductItems(selectedProduct.id)
            }
          }}
        />
    </div>
  )
}
