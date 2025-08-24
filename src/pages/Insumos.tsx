import { useState, useEffect } from "react"
import { Plus, Search, Edit, Trash2, Save, X, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MainLayout } from "@/components/layout/MainLayout"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { formatCurrencyWithCents, formatCurrencyInput, parseCurrency, getCountText } from "@/lib/utils"
import { SpreadsheetImport } from "@/components/insumos/SpreadsheetImport"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

interface Unit {
  id: number
  description: string
}

interface Item {
  id: number
  description: string
  unit_purch: number
  unit_use: number
  cost: number
  factor?: number
  unit_purch_desc?: string
  unit_use_desc?: string
}

interface ItemFormData {
  description?: string
  unit_purch?: number
  unit_use?: number
  cost?: string // String for form input, number for database
  factor?: number
}

export default function Insumos() {
  const [items, setItems] = useState<Item[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false)
  const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const { toast } = useToast()

  const [newItem, setNewItem] = useState<ItemFormData>({
    description: "",
    unit_purch: 0,
    unit_use: 0,
    cost: "",
    factor: 1
  })

  const [newUnit, setNewUnit] = useState<Partial<Unit>>({
    description: ""
  })

  useEffect(() => {
    fetchItems()
    fetchUnits()
  }, [])

  const fetchItems = async () => {
    try {
      const { data: itemsData, error } = await supabase
        .from('item')
        .select('*')
        .order('description')

      if (error) throw error

      // Fetch units separately to get descriptions
      const { data: unitsData } = await supabase
        .from('unit')
        .select('*')

      const unitsMap = (unitsData || []).reduce((acc, unit) => {
        acc[unit.id] = unit.description
        return acc
      }, {} as Record<number, string>)
      
      const itemsWithUnits = (itemsData || []).map(item => ({
        id: item.id,
        description: item.description,
        unit_purch: item.unit_purch,
        unit_use: item.unit_use,
        cost: item.cost || 0,
        factor: item.factor || 1,
        unit_purch_desc: unitsMap[item.unit_purch],
        unit_use_desc: item.unit_use ? unitsMap[item.unit_use] : undefined
      }))
      
      setItems(itemsWithUnits)
    } catch (error) {
      console.error('Erro ao carregar itens:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar itens",
        variant: "destructive"
      })
    }
  }

  const fetchUnits = async () => {
    try {
      const { data, error } = await supabase
        .from('unit')
        .select('*')
        .order('description')

      if (error) throw error
      setUnits(data || [])
    } catch (error) {
      console.error('Erro ao carregar unidades:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar unidades",
        variant: "destructive"
      })
    }
  }

  const handleSaveItem = async () => {
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('item')
          .update({
            description: newItem.description,
            unit_purch: newItem.unit_purch,
            unit_use: newItem.unit_use,
            cost: typeof newItem.cost === 'string' ? parseCurrency(newItem.cost) : newItem.cost,
            factor: newItem.factor
          })
          .eq('id', editingItem.id)

        if (error) throw error
        toast({ title: "Sucesso", description: "Item atualizado com sucesso!" })
      } else {
        const { error } = await supabase
          .from('item')
          .insert([{
            description: newItem.description,
            unit_purch: newItem.unit_purch,
            unit_use: newItem.unit_use,
            cost: typeof newItem.cost === 'string' ? parseCurrency(newItem.cost) : newItem.cost,
            factor: newItem.factor
          }])

        if (error) throw error
        toast({ title: "Sucesso", description: "Item criado com sucesso!" })
      }

      setIsItemDialogOpen(false)
      setEditingItem(null)
      setNewItem({ description: "", unit_purch: 0, unit_use: 0, cost: "", factor: 1 })
      fetchItems()
    } catch (error) {
      console.error('Erro ao salvar item:', error)
      toast({
        title: "Erro",
        description: "Erro ao salvar item",
        variant: "destructive"
      })
    }
  }

  const handleSaveUnit = async () => {
    try {
      if (editingUnit) {
        const { error } = await supabase
          .from('unit')
          .update({ description: newUnit.description })
          .eq('id', editingUnit.id)

        if (error) throw error
        toast({ title: "Sucesso", description: "Unidade atualizada com sucesso!" })
      } else {
        const { error } = await supabase
          .from('unit')
          .insert([{ description: newUnit.description }])

        if (error) throw error
        toast({ title: "Sucesso", description: "Unidade criada com sucesso!" })
      }

      setIsUnitDialogOpen(false)
      setEditingUnit(null)
      setNewUnit({ description: "" })
      fetchUnits()
      fetchItems() // Atualizar itens para mostrar novas unidades
    } catch (error) {
      console.error('Erro ao salvar unidade:', error)
      toast({
        title: "Erro",
        description: "Erro ao salvar unidade",
        variant: "destructive"
      })
    }
  }

  const handleDeleteItem = async (id: number) => {
    try {
      const { error } = await supabase
        .from('item')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      toast({ title: "Sucesso", description: "Item excluído com sucesso!" })
      fetchItems()
    } catch (error) {
      console.error('Erro ao excluir item:', error)
      toast({
        title: "Erro",
        description: "Erro ao excluir item",
        variant: "destructive"
      })
    }
  }

  const handleDeleteUnit = async (id: number) => {
    try {
      const { error } = await supabase
        .from('unit')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      toast({ title: "Sucesso", description: "Unidade excluída com sucesso!" })
      fetchUnits()
      fetchItems()
    } catch (error) {
      console.error('Erro ao excluir unidade:', error)
      toast({
        title: "Erro",
        description: "Erro ao excluir unidade",
        variant: "destructive"
      })
    }
  }

  const filteredItems = items.filter(item =>
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Insumos</h1>
            <p className="text-muted-foreground">Gerencie itens e unidades</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsImportDialogOpen(true)}
            >
              <Upload className="h-4 w-4" />
              Importar Planilha
            </Button>
            <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="premium" onClick={() => {
                  setEditingItem(null)
                  setNewItem({ description: "", unit_purch: 0, unit_use: 0, cost: "", factor: 1 })
                }}>
                  <Plus className="h-4 w-4" />
                  Novo Item
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar itens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items Table */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Itens</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getCountText(items.length, filteredItems.length, !!searchTerm, "item", "itens", "item cadastrado", "itens cadastrados")}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  <div className="p-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Unidade Compra</TableHead>
                          <TableHead>Unidade Uso</TableHead>
                          <TableHead className="text-right">Fator</TableHead>
                          <TableHead className="text-right">Custo</TableHead>
                          <TableHead className="w-24">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.description}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.unit_purch_desc}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{item.unit_use_desc}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{item.factor || 1}</TableCell>
                            <TableCell className="text-right">{formatCurrencyWithCents(item.cost || 0)}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingItem(item)
                    setNewItem({
                      description: item.description,
                      unit_purch: item.unit_purch,
                      unit_use: item.unit_use,
                      cost: formatCurrencyInput((item.cost * 100).toString()),
                      factor: item.factor
                    })
                                    setIsItemDialogOpen(true)
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                       <AlertDialogDescription>
                                         Tem certeza que deseja excluir o insumo "{item.description}"? Esta ação não pode ser desfeita.
                                       </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteItem(item.id)}>
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Units */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Unidades
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingUnit(null)
                      setNewUnit({ description: "" })
                      setIsUnitDialogOpen(true)
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {units.map((unit) => (
                  <div key={unit.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex-1">
                      <span className="font-medium">{unit.description}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => {
                          setEditingUnit(unit)
                          setNewUnit(unit)
                          setIsUnitDialogOpen(true)
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                             <AlertDialogDescription>
                               Tem certeza que deseja excluir a unidade "{unit.description}"? Esta ação não pode ser desfeita.
                             </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteUnit(unit.id)}>
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Item Dialog */}
        <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Editar Item' : 'Novo Item'}
              </DialogTitle>
              <DialogDescription>
                {editingItem ? 'Edite as informações do item.' : 'Adicione um novo item ao sistema.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="item-description">Descrição</Label>
                <Input
                  id="item-description"
                  value={newItem.description || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Digite a descrição do item"
                />
              </div>
              <div>
                <Label htmlFor="item-unit-purch">Unidade de Compra</Label>
                <Select
                  value={newItem.unit_purch?.toString() || ''}
                  onValueChange={(value) => setNewItem(prev => ({ ...prev, unit_purch: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id.toString()}>
                        {unit.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="item-unit-use">Unidade de Uso</Label>
                <Select
                  value={newItem.unit_use?.toString() || ''}
                  onValueChange={(value) => setNewItem(prev => ({ ...prev, unit_use: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id.toString()}>
                        {unit.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="item-factor">Fator de Conversão</Label>
                <Input
                  id="item-factor"
                  type="number"
                  step="0.001"
                  value={newItem.factor || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, factor: parseFloat(e.target.value) }))}
                  placeholder="1.0"
                />
              </div>
              <div>
                <Label htmlFor="item-cost">Custo</Label>
                <Input
                  id="item-cost"
                  value={newItem.cost?.toString() || ''}
                  onChange={(e) => {
                    const formattedValue = formatCurrencyInput(e.target.value);
                    setNewItem(prev => ({ ...prev, cost: formattedValue as any }));
                  }}
                  placeholder="R$ 0,00"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsItemDialogOpen(false)
                    setEditingItem(null)
                    setNewItem({ description: "", unit_purch: 0, unit_use: 0, cost: "", factor: 1 })
                  }}
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
                <Button onClick={handleSaveItem}>
                  <Save className="h-4 w-4" />
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Unit Dialog */}
        <Dialog open={isUnitDialogOpen} onOpenChange={setIsUnitDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingUnit ? 'Editar Unidade' : 'Nova Unidade'}
              </DialogTitle>
              <DialogDescription>
                {editingUnit ? 'Edite a descrição da unidade.' : 'Adicione uma nova unidade de medida.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="unit-description">Descrição</Label>
                <Input
                  id="unit-description"
                  value={newUnit.description || ''}
                  onChange={(e) => setNewUnit(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Ex: kg, litro, unidade"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsUnitDialogOpen(false)
                    setEditingUnit(null)
                    setNewUnit({ description: "" })
                  }}
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
                <Button onClick={handleSaveUnit}>
                  <Save className="h-4 w-4" />
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Spreadsheet Import Dialog */}
        <SpreadsheetImport
          isOpen={isImportDialogOpen}
          onClose={() => setIsImportDialogOpen(false)}
          units={units}
          onImportComplete={fetchItems}
        />
      </div>
    </MainLayout>
  )
}