import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Plus, Search, Upload } from "lucide-react"
import { MainLayout } from "@/components/layout/MainLayout"
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

  const fetchProductItems = async (productId: number) => {
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
      setProductItems(data?.map(item => ({ ...item, product: productId })) || [])
    }
  }

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product)
  }

  const handleProductsChange = () => {
    fetchProducts()
    // If current selected product was deleted, clear selection
    // If it still exists, update it with latest data (including efficiency changes)
    if (selectedProduct) {
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
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Produtos"
          subtitle="Gerencie produtos e seus insumos"
        >
          <div className="flex gap-2">
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

        {/* Search */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProductList
            products={filteredProducts}
            selectedProduct={selectedProduct}
            onSelectProduct={handleSelectProduct}
            onProductsChange={handleProductsChange}
            allProducts={products}
            searchTerm={searchTerm}
          />

          <ProductItems
            selectedProduct={selectedProduct}
            productItems={productItems}
            units={units}
            onAddItem={handleAddItem}
            onEditItem={handleEditItem}
            onProductItemsChange={handleProductItemsChange}
          />
        </div>

        <ProductForm
          isOpen={isAddingProduct}
          onOpenChange={setIsAddingProduct}
          onSuccess={fetchProducts}
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
    </MainLayout>
  )
}