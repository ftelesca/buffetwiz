import { useState } from "react"
import { Upload, FileText, X, Check, AlertCircle, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import Papa from "papaparse"
import * as XLSX from "xlsx"

interface Item {
  id: string
  description: string
}

interface ParsedProductItem {
  productDescription: string
  efficiency: number
  itemDescription: string
  qty: number
  errors: string[]
  rowIndex: number
  productId?: string
  itemId?: string
  existingProductItemId?: string
  isProductUpdate?: boolean
  isProductItemUpdate?: boolean
}

interface ProductSpreadsheetImportProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete: () => void
}

export function ProductSpreadsheetImport({ isOpen, onClose, onImportComplete }: ProductSpreadsheetImportProps) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedProductItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const { toast } = useToast()

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      parseFile(selectedFile)
    }
  }

  const parseFile = async (file: File) => {
    setIsProcessing(true)
    try {
      let data: any[] = []

      if (file.name.endsWith('.csv')) {
        // Parse CSV
        Papa.parse(file, {
          complete: (results) => {
            data = results.data as any[]
            processData(data)
          },
          header: false,
          skipEmptyLines: true
        })
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Parse Excel
        const arrayBuffer = await file.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        processData(data)
      } else {
        throw new Error('Formato de arquivo não suportado. Use CSV ou Excel (.xlsx)')
      }
    } catch (error) {
      console.error('Erro ao processar arquivo:', error)
      toast({
        title: "Erro",
        description: "Erro ao processar arquivo. Verifique o formato e tente novamente.",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const formatTitleCase = (text: string): string => {
    const connectingWords = ['de', 'da', 'do', 'das', 'dos', 'com', 'para', 'por', 'em', 'na', 'no', 'nas', 'nos', 'a', 'e', 'ou']
    
    return text
      .toLowerCase()
      .split(' ')
      .map((word, index) => {
        // Always capitalize first word
        if (index === 0) {
          return word.charAt(0).toUpperCase() + word.slice(1)
        }
        // Keep connecting words lowercase
        if (connectingWords.includes(word)) {
          return word
        }
        // Capitalize other words
        return word.charAt(0).toUpperCase() + word.slice(1)
      })
      .join(' ')
  }

  const processData = async (data: any[][]) => {
    const items: ParsedProductItem[] = []
    
    // Fetch existing products and items
    const { data: existingProducts } = await supabase
      .from('recipe')
      .select('id, description')
    
    const { data: existingItems } = await supabase
      .from('item')
      .select('id, description')

    const { data: existingProductItems } = await supabase
      .from('recipe_item')
      .select('recipe, item')
    
    // Skip header row and process data
    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      if (!row || row.length === 0) continue

      const productDescription = formatTitleCase(row[0]?.toString().trim() || '')
      const efficiency = parseFloat(row[1]?.toString()) || 1
      const itemDescription = row[2]?.toString().trim() || ''
      const qty = parseFloat(row[3]?.toString()) || 0

      const item: ParsedProductItem = {
        productDescription,
        efficiency,
        itemDescription,
        qty,
        errors: [],
        rowIndex: i + 1
      }

      // Validate required fields
      if (!item.productDescription) {
        item.errors.push('Descrição do produto é obrigatória')
      }

      if (!item.itemDescription) {
        item.errors.push('Descrição do insumo é obrigatória')
      }

      if (isNaN(item.qty) || item.qty <= 0) {
        item.errors.push('Quantidade deve ser um número válido e maior que zero')
      }

      if (isNaN(item.efficiency) || item.efficiency <= 0) {
        item.errors.push('Rendimento deve ser um número válido e maior que zero')
      }

      // Find or identify product
      const existingProduct = existingProducts?.find(product => 
        product.description.toUpperCase() === item.productDescription.toUpperCase()
      )
      
      if (existingProduct) {
        item.productId = existingProduct.id
        item.isProductUpdate = true
      }

      // Find item
      const existingItem = existingItems?.find(itemRecord => 
        itemRecord.description.toUpperCase() === item.itemDescription.toUpperCase()
      )
      
      if (existingItem) {
        item.itemId = existingItem.id
      } else {
        item.errors.push(`Insumo "${item.itemDescription}" não encontrado`)
      }

      // Check if product item already exists
      if (item.productId && item.itemId) {
        const existingProductItem = existingProductItems?.find(ri => 
          ri.recipe === item.productId && ri.item === item.itemId
        )
        
        if (existingProductItem) {
          item.isProductItemUpdate = true
        }
      }

      items.push(item)
    }

    setParsedData(items)
    setShowPreview(true)
  }

  const handleImport = async () => {
    const validItems = parsedData.filter(item => item.errors.length === 0)
    
    if (validItems.length === 0) {
      toast({
        title: "Erro",
        description: "Nenhum item válido para importar",
        variant: "destructive"
      })
      return
    }

    setIsProcessing(true)
    try {
      // Group by product to process efficiently
      const productGroups = new Map<string, ParsedProductItem[]>()
      
      validItems.forEach(item => {
        const key = item.productDescription.toUpperCase()
        if (!productGroups.has(key)) {
          productGroups.set(key, [])
        }
        productGroups.get(key)!.push(item)
      })

      let newProductsCount = 0
      let updatedProductsCount = 0
      let newProductItemsCount = 0
      let updatedProductItemsCount = 0

      // Process each product group
      for (const [productKey, productItems] of productGroups) {
        const firstItem = productItems[0]
        let productId = firstItem.productId

        // Create or update product
        if (!productId) {
          // Create new product
          const { data: newProduct, error: productError } = await supabase
            .from('recipe')
            .insert([{
              description: firstItem.productDescription,
              efficiency: firstItem.efficiency,
              user_id: user?.id
            }])
            .select('id')
            .single()

          if (productError) throw productError
          productId = newProduct.id
          newProductsCount++
        } else {
          // Update existing product (just to ensure it's current)
          await supabase
            .from('recipe')
            .update({ 
              description: firstItem.productDescription,
              efficiency: firstItem.efficiency
            })
            .eq('id', productId)
          updatedProductsCount++
        }

        // Process product items
        for (const item of productItems) {
          if (item.isProductItemUpdate) {
            // Update existing product item
            await supabase
              .from('recipe_item')
              .update({ qty: item.qty })
              .eq('recipe', productId)
              .eq('item', item.itemId!)
            updatedProductItemsCount++
          } else {
            // Create new product item
            await supabase
              .from('recipe_item')
              .insert([{
                recipe: productId,
                item: item.itemId!,
                qty: item.qty
              }])
            newProductItemsCount++
          }
        }
      }

      toast({ 
        title: `Importação concluída`,
        description: `${newProductsCount} produtos criados, ${updatedProductsCount} produtos atualizados, ${newProductItemsCount} itens adicionados, ${updatedProductItemsCount} itens atualizados`
      })

      onImportComplete()
      handleClose()
    } catch (error) {
      console.error('Erro ao importar produtos:', error)
      toast({
        title: "Erro",
        description: "Erro ao importar produtos. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setParsedData([])
    setShowPreview(false)
    onClose()
  }

  const downloadTemplate = () => {
    const template = [
      ['Produto', 'Rendimento', 'Insumo', 'Qtd'],
      ['Arroz de Festa', '1', 'Arroz Branco', '500'],
      ['Arroz de Festa', '1', 'Azeite de Oliva', '50'],
      ['Feijão Tropeiro', '1.2', 'Feijão Preto', '300'],
      ['Feijão Tropeiro', '1.2', 'Bacon', '100']
    ]

    const csv = Papa.unparse(template)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'modelo_produtos.csv'
    link.click()
  }

  const validItems = parsedData.filter(item => item.errors.length === 0)
  const invalidItems = parsedData.filter(item => item.errors.length > 0)
  const newProducts = [...new Set(validItems.filter(item => !item.isProductUpdate).map(item => item.productDescription))]
  const updatedProducts = [...new Set(validItems.filter(item => item.isProductUpdate).map(item => item.productDescription))]
  const newProductItems = validItems.filter(item => !item.isProductItemUpdate)
  const updatedProductItems = validItems.filter(item => item.isProductItemUpdate)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Importar Planilha de Produtos</DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV ou Excel com produtos e seus insumos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto">
          {!showPreview ? (
            <div className="space-y-4">
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  <strong>Formato esperado:</strong> Produto, Rendimento, Insumo, Qtd
                  <br />
                  <strong>Importante:</strong> Os insumos devem estar previamente cadastrados no sistema
                  <br />
                  <Button 
                    variant="link" 
                    className="p-0 h-auto font-normal"
                    onClick={downloadTemplate}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Baixar modelo de exemplo
                  </Button>
                </AlertDescription>
              </Alert>

              <Card>
                <CardContent className="pt-6">
                  {isProcessing ? (
                    <div className="flex flex-col items-center justify-center p-8 space-y-4">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Preparando prévia...</p>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <div className="space-y-2">
                        <p className="text-lg font-medium">Selecione um arquivo</p>
                        <p className="text-sm text-muted-foreground">
                          Formatos suportados: CSV, Excel (.xlsx)
                        </p>
                        <input
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          onChange={handleFileChange}
                          className="hidden"
                          id="product-file-upload"
                        />
                        <label htmlFor="product-file-upload">
                          <Button variant="outline" className="cursor-pointer" asChild>
                            <span>Escolher Arquivo</span>
                          </Button>
                        </label>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Prévia da Importação</h3>
                  <p className="text-sm text-muted-foreground">
                    {newProducts.length} produtos novos, {updatedProducts.length} produtos atualizados, {newProductItems.length} itens novos, {updatedProductItems.length} itens atualizados, {invalidItems.length} com erro
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowPreview(false)}>
                    <X className="h-4 w-4" />
                    Voltar
                  </Button>
                  <Button 
                    onClick={handleImport}
                    disabled={validItems.length === 0 || isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Processar ({validItems.length} itens válidos)
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Linha</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Rendimento</TableHead>
                      <TableHead>Insumo</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.rowIndex}</TableCell>
                        <TableCell>{item.productDescription}</TableCell>
                        <TableCell>{item.efficiency}</TableCell>
                        <TableCell>{item.itemDescription}</TableCell>
                        <TableCell>{item.qty}</TableCell>
                        <TableCell>
                          {item.errors.length === 0 ? (
                            <div className="space-y-1">
                              <Badge variant={item.isProductUpdate ? "secondary" : "default"} className={item.isProductUpdate ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}>
                                {item.isProductUpdate ? "Produto: Atualizar" : "Produto: Criar"}
                              </Badge>
                              <Badge variant={item.isProductItemUpdate ? "secondary" : "default"} className={item.isProductItemUpdate ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}>
                                {item.isProductItemUpdate ? "Item: Atualizar" : "Item: Criar"}
                              </Badge>
                            </div>
                          ) : (
                            <Badge variant="destructive">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              {item.errors.length} erro(s)
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {invalidItems.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-600">Itens com Erro</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                      {invalidItems.map((item, index) => (
                        <div key={index} className="border-l-4 border-red-500 pl-3">
                          <p className="font-medium">Linha {item.rowIndex}: {item.productDescription} - {item.itemDescription}</p>
                          <ul className="text-sm text-red-600 list-disc list-inside">
                            {item.errors.map((error, errorIndex) => (
                              <li key={errorIndex}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {validItems.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {newProducts.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-green-600">Produtos Novos ({newProducts.length})</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="text-sm space-y-1">
                          {newProducts.map((product, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <Check className="h-3 w-3 text-green-600" />
                              {product}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {updatedProducts.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-blue-600">Produtos Atualizados ({updatedProducts.length})</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="text-sm space-y-1">
                          {updatedProducts.map((product, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <Check className="h-3 w-3 text-blue-600" />
                              {product}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}