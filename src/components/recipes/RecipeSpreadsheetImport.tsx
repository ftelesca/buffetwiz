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
  id: number
  description: string
}

interface ParsedRecipeItem {
  recipeDescription: string
  itemDescription: string
  qty: number
  errors: string[]
  rowIndex: number
  recipeId?: number
  itemId?: number
  existingRecipeItemId?: number
  isRecipeUpdate?: boolean
  isRecipeItemUpdate?: boolean
}

interface RecipeSpreadsheetImportProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete: () => void
}

export function RecipeSpreadsheetImport({ isOpen, onClose, onImportComplete }: RecipeSpreadsheetImportProps) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedRecipeItem[]>([])
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
    const items: ParsedRecipeItem[] = []
    
    // Fetch existing recipes and items
    const { data: existingRecipes } = await supabase
      .from('recipe')
      .select('id, description')
    
    const { data: existingItems } = await supabase
      .from('item')
      .select('id, description')

    const { data: existingRecipeItems } = await supabase
      .from('recipe_item')
      .select('id, recipe, item')
    
    // Skip header row and process data
    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      if (!row || row.length === 0) continue

      const recipeDescription = formatTitleCase(row[0]?.toString().trim() || '')
      const itemDescription = row[1]?.toString().trim() || ''
      const qty = parseFloat(row[2]?.toString()) || 0

      const item: ParsedRecipeItem = {
        recipeDescription,
        itemDescription,
        qty,
        errors: [],
        rowIndex: i + 1
      }

      // Validate required fields
      if (!item.recipeDescription) {
        item.errors.push('Descrição da receita é obrigatória')
      }

      if (!item.itemDescription) {
        item.errors.push('Descrição do insumo é obrigatória')
      }

      if (isNaN(item.qty) || item.qty <= 0) {
        item.errors.push('Quantidade deve ser um número válido e maior que zero')
      }

      // Find or identify recipe
      const existingRecipe = existingRecipes?.find(recipe => 
        recipe.description.toUpperCase() === item.recipeDescription.toUpperCase()
      )
      
      if (existingRecipe) {
        item.recipeId = existingRecipe.id
        item.isRecipeUpdate = true
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

      // Check if recipe item already exists
      if (item.recipeId && item.itemId) {
        const existingRecipeItem = existingRecipeItems?.find(ri => 
          ri.recipe === item.recipeId && ri.item === item.itemId
        )
        
        if (existingRecipeItem) {
          item.existingRecipeItemId = existingRecipeItem.id
          item.isRecipeItemUpdate = true
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
      // Group by recipe to process efficiently
      const recipeGroups = new Map<string, ParsedRecipeItem[]>()
      
      validItems.forEach(item => {
        const key = item.recipeDescription.toUpperCase()
        if (!recipeGroups.has(key)) {
          recipeGroups.set(key, [])
        }
        recipeGroups.get(key)!.push(item)
      })

      let newRecipesCount = 0
      let updatedRecipesCount = 0
      let newRecipeItemsCount = 0
      let updatedRecipeItemsCount = 0

      // Process each recipe group
      for (const [recipeKey, recipeItems] of recipeGroups) {
        const firstItem = recipeItems[0]
        let recipeId = firstItem.recipeId

        // Create or update recipe
        if (!recipeId) {
          // Create new recipe
          const { data: newRecipe, error: recipeError } = await supabase
            .from('recipe')
            .insert([{
              description: firstItem.recipeDescription,
              user_id: user?.id
            }])
            .select('id')
            .single()

          if (recipeError) throw recipeError
          recipeId = newRecipe.id
          newRecipesCount++
        } else {
          // Update existing recipe (just to ensure it's current)
          await supabase
            .from('recipe')
            .update({ description: firstItem.recipeDescription })
            .eq('id', recipeId)
          updatedRecipesCount++
        }

        // Process recipe items
        for (const item of recipeItems) {
          if (item.existingRecipeItemId) {
            // Update existing recipe item
            await supabase
              .from('recipe_item')
              .update({ qty: item.qty })
              .eq('id', item.existingRecipeItemId)
            updatedRecipeItemsCount++
          } else {
            // Create new recipe item
            await supabase
              .from('recipe_item')
              .insert([{
                recipe: recipeId,
                item: item.itemId!,
                qty: item.qty
              }])
            newRecipeItemsCount++
          }
        }
      }

      toast({ 
        title: `Importação concluída`,
        description: `${newRecipesCount} receitas criadas, ${updatedRecipesCount} receitas atualizadas, ${newRecipeItemsCount} itens adicionados, ${updatedRecipeItemsCount} itens atualizados`
      })

      onImportComplete()
      handleClose()
    } catch (error) {
      console.error('Erro ao importar receitas:', error)
      toast({
        title: "Erro",
        description: "Erro ao importar receitas. Tente novamente.",
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
      ['Receita', 'Insumo', 'Qtd'],
      ['Arroz de Festa', 'Arroz Branco', '500'],
      ['Arroz de Festa', 'Azeite de Oliva', '50'],
      ['Feijão Tropeiro', 'Feijão Preto', '300'],
      ['Feijão Tropeiro', 'Bacon', '100']
    ]

    const csv = Papa.unparse(template)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'modelo_receitas.csv'
    link.click()
  }

  const validItems = parsedData.filter(item => item.errors.length === 0)
  const invalidItems = parsedData.filter(item => item.errors.length > 0)
  const newRecipes = [...new Set(validItems.filter(item => !item.isRecipeUpdate).map(item => item.recipeDescription))]
  const updatedRecipes = [...new Set(validItems.filter(item => item.isRecipeUpdate).map(item => item.recipeDescription))]
  const newRecipeItems = validItems.filter(item => !item.isRecipeItemUpdate)
  const updatedRecipeItems = validItems.filter(item => item.isRecipeItemUpdate)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Importar Planilha de Receitas</DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV ou Excel com receitas e seus insumos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto">
          {!showPreview ? (
            <div className="space-y-4">
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  <strong>Formato esperado:</strong> Receita, Insumo, Qtd
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
                          id="recipe-file-upload"
                        />
                        <label htmlFor="recipe-file-upload">
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
                    {newRecipes.length} receitas novas, {updatedRecipes.length} receitas atualizadas, {newRecipeItems.length} itens novos, {updatedRecipeItems.length} itens atualizados, {invalidItems.length} com erro
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
                      <TableHead>Receita</TableHead>
                      <TableHead>Insumo</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.rowIndex}</TableCell>
                        <TableCell>{item.recipeDescription}</TableCell>
                        <TableCell>{item.itemDescription}</TableCell>
                        <TableCell>{item.qty}</TableCell>
                        <TableCell>
                          {item.errors.length === 0 ? (
                            <div className="space-y-1">
                              <Badge variant={item.isRecipeUpdate ? "secondary" : "default"} className={item.isRecipeUpdate ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}>
                                {item.isRecipeUpdate ? "Receita: Atualizar" : "Receita: Criar"}
                              </Badge>
                              <Badge variant={item.isRecipeItemUpdate ? "secondary" : "default"} className={item.isRecipeItemUpdate ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}>
                                {item.isRecipeItemUpdate ? "Item: Atualizar" : "Item: Criar"}
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
                    <div className="space-y-2">
                      {invalidItems.map((item, index) => (
                        <div key={index} className="border-l-4 border-red-500 pl-3">
                          <p className="font-medium">Linha {item.rowIndex}: {item.recipeDescription} - {item.itemDescription}</p>
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
                  {newRecipes.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-green-600">Receitas Novas ({newRecipes.length})</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="text-sm space-y-1">
                          {newRecipes.map((recipe, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <Check className="h-3 w-3 text-green-600" />
                              {recipe}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {updatedRecipes.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-blue-600">Receitas Atualizadas ({updatedRecipes.length})</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="text-sm space-y-1">
                          {updatedRecipes.map((recipe, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <Check className="h-3 w-3 text-blue-600" />
                              {recipe}
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