import { useState } from "react"
import { Upload, FileText, X, Check, AlertCircle, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { parseSpreadsheetCurrency } from "@/lib/utils"
import Papa from "papaparse"
import * as XLSX from "xlsx"

interface Unit {
  id: number
  description: string
}

interface ParsedItem {
  description: string
  unit_purch_name: string
  unit_use_name: string
  cost: number
  factor: number
  unit_purch?: number
  unit_use?: number
  errors: string[]
  rowIndex: number
  existingId?: number
  isUpdate?: boolean
}

interface SpreadsheetImportProps {
  isOpen: boolean
  onClose: () => void
  units: Unit[]
  onImportComplete: () => void
}

export function SpreadsheetImport({ isOpen, onClose, units, onImportComplete }: SpreadsheetImportProps) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedItem[]>([])
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
    const items: ParsedItem[] = []
    
    // Fetch existing insumos to check for duplicates
    const { supabase } = await import("@/integrations/supabase/client")
    const { data: existingItems } = await supabase
      .from('item')
      .select('id, description')
    
    // Skip header row and process data
    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      if (!row || row.length === 0) continue

      const unitPurchName = row[1]?.toString().trim() || 'un'
      const unitUseName = row[2]?.toString().trim() || 'un'
      const rawFactor = parseFloat(row[3]?.toString()) || 1
      
      // Set factor to 1 if purchase and use units are the same
      const factor = unitPurchName.toLowerCase() === unitUseName.toLowerCase() ? 1 : rawFactor

      const item: ParsedItem = {
        description: formatTitleCase(row[0]?.toString().trim() || ''),
        unit_purch_name: unitPurchName,
        unit_use_name: unitUseName,
        factor: factor,
        cost: parseSpreadsheetCurrency(row[4]),
        errors: [],
        rowIndex: i + 1
      }

      // Check if insumo already exists (case-insensitive)
      const existingItem = existingItems?.find(existing => 
        existing.description.toUpperCase() === item.description.toUpperCase()
      )
      
      if (existingItem) {
        item.existingId = existingItem.id
        item.isUpdate = true
      }

      // Validate and find units
      if (!item.description) {
        item.errors.push('Descrição é obrigatória')
      }

      if (!item.unit_purch_name) {
        item.errors.push('Unidade de compra é obrigatória')
      } else {
        const purchUnit = units.find(u => 
          u.description.toLowerCase() === item.unit_purch_name.toLowerCase()
        )
        if (purchUnit) {
          item.unit_purch = purchUnit.id
        } else {
          item.errors.push(`Unidade de compra "${item.unit_purch_name}" não encontrada`)
        }
      }

      if (!item.unit_use_name) {
        item.errors.push('Unidade de uso é obrigatória')
      } else {
        const useUnit = units.find(u => 
          u.description.toLowerCase() === item.unit_use_name.toLowerCase()
        )
        if (useUnit) {
          item.unit_use = useUnit.id
        } else {
          item.errors.push(`Unidade de uso "${item.unit_use_name}" não encontrada`)
        }
      }

      if (isNaN(item.cost) || item.cost < 0) {
        item.errors.push('Custo deve ser um número válido e positivo')
      }

      if (isNaN(item.factor) || item.factor <= 0) {
        item.errors.push('Fator deve ser um número válido e maior que zero')
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
        description: "Nenhum insumo válido para importar",
        variant: "destructive"
      })
      return
    }

    setIsProcessing(true)
    try {
      const { supabase } = await import("@/integrations/supabase/client")
      
      // Separate insumos for update and insert
      const itemsToUpdate = validItems.filter(item => item.isUpdate)
      const itemsToInsert = validItems.filter(item => !item.isUpdate)
      
      // Handle updates
      for (const item of itemsToUpdate) {
        await supabase
          .from('item')
          .update({
            description: item.description,
            unit_purch: item.unit_purch!,
            unit_use: item.unit_use!,
            cost: item.cost,
            factor: item.factor
          })
          .eq('id', item.existingId!)
      }
      
      // Handle inserts
      if (itemsToInsert.length > 0) {
        const dataToInsert = itemsToInsert.map(item => ({
          description: item.description,
          unit_purch: item.unit_purch!,
          unit_use: item.unit_use!,
          cost: item.cost,
          factor: item.factor,
          user_id: user?.id
        }))

        const { error } = await supabase
          .from('item')
          .insert(dataToInsert)

        if (error) throw error
      }

      const updateCount = itemsToUpdate.length
      const insertCount = itemsToInsert.length
      
      toast({ title: `${insertCount} insumos inseridos, ${updateCount} insumos atualizados` })

      onImportComplete()
      handleClose()
    } catch (error) {
      console.error('Erro ao importar insumos:', error)
      toast({
        title: "Erro",
        description: "Erro ao importar insumos. Tente novamente.",
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
      ['Descrição', 'Unidade Compra', 'Unidade Uso', 'Fator', 'Custo'],
      ['Arroz Branco', 'kg', 'g', '0.001', '5,99'],
      ['Feijão Preto', 'kg', 'g', '0.001', '8,50'],
      ['Azeite de Oliva', 'L', 'ml', '0.001', '15,90']
    ]

    const csv = Papa.unparse(template)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'modelo_insumos.csv'
    link.click()
  }

  const validItems = parsedData.filter(item => item.errors.length === 0)
  const invalidItems = parsedData.filter(item => item.errors.length > 0)
  const updateItems = validItems.filter(item => item.isUpdate)
  const insertItems = validItems.filter(item => !item.isUpdate)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Importar Planilha de Insumos</DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV ou Excel com os dados dos insumos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto">
          {!showPreview ? (
            <div className="space-y-4">
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  <strong>Formato esperado:</strong> Descrição, Unidade Compra, Unidade Uso, Fator, Custo
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
                          id="file-upload"
                        />
                        <label htmlFor="file-upload">
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
                    {insertItems.length} novos, {updateItems.length} atualizações, {invalidItems.length} com erro
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
                        Processar ({insertItems.length} novos, {updateItems.length} atualizações)
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
                      <TableHead>Descrição</TableHead>
                      <TableHead>Un. Compra</TableHead>
                      <TableHead>Un. Uso</TableHead>
                      <TableHead>Fator</TableHead>
                      <TableHead>Custo</TableHead>
                      <TableHead>Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.rowIndex}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.unit_purch_name}</TableCell>
                        <TableCell>{item.unit_use_name}</TableCell>
                        <TableCell>{item.factor}</TableCell>
                        <TableCell>R$ {item.cost.toFixed(2)}</TableCell>
                        <TableCell>
                          {item.errors.length === 0 ? (
                            <Badge variant={item.isUpdate ? "secondary" : "default"} className={item.isUpdate ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}>
                              <Check className="h-3 w-3 mr-1" />
                              {item.isUpdate ? "Atualizar" : "Inserir"}
                            </Badge>
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
                    <CardTitle className="text-red-600">Insumos com Erro</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {invalidItems.map((item, index) => (
                        <div key={index} className="border-l-4 border-red-500 pl-3">
                          <p className="font-medium">Linha {item.rowIndex}: {item.description}</p>
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
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}