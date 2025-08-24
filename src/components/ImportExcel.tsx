import { useState } from "react"
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import * as XLSX from 'xlsx'

interface ImportExcelProps {
  onImportComplete: () => void
}

interface ExcelRow {
  description: string
  unit_purch: number
  unit_use: number
  cost: number
  factor: number
}

export function ImportExcel({ onImportComplete }: ImportExcelProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [preview, setPreview] = useState<ExcelRow[]>([])
  const { toast } = useToast()

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo Excel (.xlsx ou .xls)",
        variant: "destructive"
      })
      return
    }

    setFile(selectedFile)
    await processFile(selectedFile, true) // Preview mode
  }

  const processFile = async (file: File, isPreview = false) => {
    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
      
      if (jsonData.length < 2) {
        toast({
          title: "Erro",
          description: "O arquivo deve conter pelo menos uma linha de cabeçalho e uma linha de dados",
          variant: "destructive"
        })
        return []
      }

      // Skip header row and process data
      const processedData: ExcelRow[] = []
      
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i]
        if (!row || row.length < 5) continue

        const item: ExcelRow = {
          description: String(row[0] || '').trim(),
          unit_purch: Number(row[1]) || 1,
          unit_use: Number(row[2]) || 1,
          cost: Number(row[3]) || 0,
          factor: Number(row[4]) || 1
        }

        if (item.description) {
          processedData.push(item)
        }
      }

      if (isPreview) {
        setPreview(processedData.slice(0, 5)) // Show first 5 rows for preview
      }

      return processedData
    } catch (error) {
      console.error('Error processing file:', error)
      toast({
        title: "Erro",
        description: "Erro ao processar o arquivo Excel",
        variant: "destructive"
      })
      return []
    }
  }

  const handleImport = async () => {
    if (!file) return

    setIsLoading(true)
    setProgress(0)

    try {
      const data = await processFile(file)
      if (data.length === 0) {
        toast({
          title: "Erro",
          description: "Nenhum item válido encontrado no arquivo",
          variant: "destructive"
        })
        return
      }

      // Import data in batches
      const batchSize = 10
      let imported = 0

      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize)
        
        const { error } = await supabase
          .from('item')
          .insert(batch)

        if (error) {
          console.error('Batch import error:', error)
          toast({
            title: "Erro",
            description: `Erro ao importar dados: ${error.message}`,
            variant: "destructive"
          })
          return
        }

        imported += batch.length
        setProgress((imported / data.length) * 100)
      }

      toast({
        title: "Sucesso",
        description: `${imported} itens importados com sucesso!`
      })

      setFile(null)
      setPreview([])
      onImportComplete()
    } catch (error) {
      console.error('Import error:', error)
      toast({
        title: "Erro",
        description: "Erro durante a importação",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
      setProgress(0)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Importar do Excel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            O arquivo Excel deve ter as colunas: Descrição, Unidade Compra (ID), Unidade Uso (ID), Custo, Fator de Conversão
          </AlertDescription>
        </Alert>

        <div>
          <Label htmlFor="excel-file">Arquivo Excel</Label>
          <Input
            id="excel-file"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            disabled={isLoading}
          />
        </div>

        {preview.length > 0 && (
          <div>
            <Label>Prévia dos dados (primeiras 5 linhas):</Label>
            <div className="mt-2 border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Descrição</th>
                    <th className="p-2 text-left">Un. Compra</th>
                    <th className="p-2 text-left">Un. Uso</th>
                    <th className="p-2 text-left">Custo</th>
                    <th className="p-2 text-left">Fator</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((item, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-2">{item.description}</td>
                      <td className="p-2">{item.unit_purch}</td>
                      <td className="p-2">{item.unit_use}</td>
                      <td className="p-2">{item.cost.toFixed(2)}</td>
                      <td className="p-2">{item.factor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="space-y-2">
            <Label>Progresso da importação:</Label>
            <Progress value={progress} />
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleImport}
            disabled={!file || isLoading}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isLoading ? 'Importando...' : 'Importar Dados'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}