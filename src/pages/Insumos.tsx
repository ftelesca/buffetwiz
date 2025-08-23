import { useState, useEffect } from "react"
import { Plus, Search, Edit, Trash2, Save, X, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MainLayout } from "@/components/layout/MainLayout"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface Unit {
  id: number
  description: string
}

interface UnitConversion {
  unit_from: number
  unit_to: number
  factor: number
  unit_from_desc?: string
  unit_to_desc?: string
}

interface Item {
  id: number
  description: string
  unit: number
  cost: number
  unit_desc?: string
}

export default function Insumos() {
  const [items, setItems] = useState<Item[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [unitConversions, setUnitConversions] = useState<UnitConversion[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  const [editingConversion, setEditingConversion] = useState<UnitConversion | null>(null)
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false)
  const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false)
  const [isConversionDialogOpen, setIsConversionDialogOpen] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)
  const { toast } = useToast()

  const [newItem, setNewItem] = useState<Partial<Item>>({
    description: "",
    unit: 0,
    cost: 0
  })

  const [newUnit, setNewUnit] = useState<Partial<Unit>>({
    description: ""
  })

  const [newConversion, setNewConversion] = useState<Partial<UnitConversion>>({
    unit_from: 0,
    unit_to: 0,
    factor: 1
  })

  useEffect(() => {
    fetchItems()
    fetchUnits()
    fetchUnitConversions()
  }, [])

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('item')
        .select(`
          *,
          unit:unit(description)
        `)
        .order('description')

      if (error) throw error
      
      const itemsWithUnit = data?.map(item => ({
        ...item,
        unit_desc: item.unit?.description
      })) || []
      
      setItems(itemsWithUnit)
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

  const fetchUnitConversions = async () => {
    try {
      const { data, error } = await supabase
        .from('unit_conv')
        .select('*')

      if (error) throw error
      
      // Buscar descrições das unidades separadamente para evitar confusão
      const conversionsWithDesc = await Promise.all(
        (data || []).map(async (conv) => {
          const [fromUnit, toUnit] = await Promise.all([
            supabase.from('unit').select('description').eq('id', conv.unit_from).single(),
            supabase.from('unit').select('description').eq('id', conv.unit_to).single()
          ])
          
          return {
            unit_from: conv.unit_from,
            unit_to: conv.unit_to,
            factor: conv.factor,
            unit_from_desc: fromUnit.data?.description,
            unit_to_desc: toUnit.data?.description
          }
        })
      )
      
      setUnitConversions(conversionsWithDesc)
    } catch (error) {
      console.error('Erro ao carregar conversões:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar conversões de unidades",
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
            unit: newItem.unit,
            cost: newItem.cost
          })
          .eq('id', editingItem.id)

        if (error) throw error
        toast({ title: "Sucesso", description: "Item atualizado com sucesso!" })
      } else {
        const { error } = await supabase
          .from('item')
          .insert([{
            description: newItem.description,
            unit: newItem.unit,
            cost: newItem.cost
          }])

        if (error) throw error
        toast({ title: "Sucesso", description: "Item criado com sucesso!" })
      }

      setIsItemDialogOpen(false)
      setEditingItem(null)
      setNewItem({ description: "", unit: 0, cost: 0 })
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

  const handleSaveConversion = async () => {
    try {
      if (editingConversion) {
        // Deletar a conversão antiga e criar uma nova (já que as chaves são compostas)
        await supabase
          .from('unit_conv')
          .delete()
          .eq('unit_from', editingConversion.unit_from)
          .eq('unit_to', editingConversion.unit_to)

        const { error } = await supabase
          .from('unit_conv')
          .insert([{
            unit_from: newConversion.unit_from,
            unit_to: newConversion.unit_to,
            factor: newConversion.factor
          }])

        if (error) throw error
        toast({ title: "Sucesso", description: "Conversão atualizada com sucesso!" })
      } else {
        const { error } = await supabase
          .from('unit_conv')
          .insert([{
            unit_from: newConversion.unit_from,
            unit_to: newConversion.unit_to,
            factor: newConversion.factor
          }])

        if (error) throw error
        toast({ title: "Sucesso", description: "Conversão criada com sucesso!" })
      }
      
      setIsConversionDialogOpen(false)
      setEditingConversion(null)
      setNewConversion({ unit_from: 0, unit_to: 0, factor: 1 })
      fetchUnitConversions()
    } catch (error) {
      console.error('Erro ao salvar conversão:', error)
      toast({
        title: "Erro",
        description: "Erro ao salvar conversão",
        variant: "destructive"
      })
    }
  }

  const handleDeleteConversion = async (unitFrom: number, unitTo: number) => {
    try {
      const { error } = await supabase
        .from('unit_conv')
        .delete()
        .eq('unit_from', unitFrom)
        .eq('unit_to', unitTo)

      if (error) throw error
      
      toast({ title: "Sucesso", description: "Conversão excluída com sucesso!" })
      fetchUnitConversions()
    } catch (error) {
      console.error('Erro ao excluir conversão:', error)
      toast({
        title: "Erro",
        description: "Erro ao excluir conversão",
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

  const getConversionsForUnit = (unitId: number) => {
    return unitConversions.filter(conv => conv.unit_from === unitId)
  }

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
            <Dialog open={isUnitDialogOpen} onOpenChange={setIsUnitDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => {
                  setEditingUnit(null)
                  setNewUnit({ description: "" })
                }}>
                  <Plus className="h-4 w-4" />
                  Nova Unidade
                </Button>
              </DialogTrigger>
            </Dialog>
            <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="premium" onClick={() => {
                  setEditingItem(null)
                  setNewItem({ description: "", unit: 0, cost: 0 })
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
                <CardTitle>Itens</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Custo</TableHead>
                      <TableHead className="w-24">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.unit_desc}</Badge>
                        </TableCell>
                        <TableCell>R$ {item.cost?.toFixed(2) || '0,00'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditingItem(item)
                                setNewItem(item)
                                setIsItemDialogOpen(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Units & Conversions */}
          <div className="space-y-6">
            {/* Units */}
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
                      <div className="text-xs text-muted-foreground">
                        {getConversionsForUnit(unit.id).length} conversões
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => {
                          setSelectedUnit(unit)
                          setNewConversion({ unit_from: unit.id, unit_to: 0, factor: 1 })
                          setIsConversionDialogOpen(true)
                        }}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
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
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => handleDeleteUnit(unit.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Unit Conversions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Conversões de Unidades
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedUnit(null)
                      setNewConversion({ unit_from: 0, unit_to: 0, factor: 1 })
                      setIsConversionDialogOpen(true)
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {unitConversions.map((conversion, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {conversion.unit_from_desc} → {conversion.unit_to_desc}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Fator: {conversion.factor}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => {
                          setEditingConversion(conversion)
                          setNewConversion({
                            unit_from: conversion.unit_from,
                            unit_to: conversion.unit_to,
                            factor: conversion.factor
                          })
                          setSelectedUnit(null)
                          setIsConversionDialogOpen(true)
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => handleDeleteConversion(conversion.unit_from, conversion.unit_to)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
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
                <Label htmlFor="item-unit">Unidade</Label>
                <Select
                  value={newItem.unit?.toString() || ''}
                  onValueChange={(value) => setNewItem(prev => ({ ...prev, unit: parseInt(value) }))}
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
                <Label htmlFor="item-cost">Custo</Label>
                <Input
                  id="item-cost"
                  type="number"
                  step="0.01"
                  value={newItem.cost || ''}
                  onChange={(e) => setNewItem(prev => ({ ...prev, cost: parseFloat(e.target.value) }))}
                  placeholder="0.00"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsItemDialogOpen(false)
                    setEditingItem(null)
                    setNewItem({ description: "", unit: 0, cost: 0 })
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

        {/* Conversion Dialog */}
        <Dialog open={isConversionDialogOpen} onOpenChange={setIsConversionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingConversion ? 'Editar Conversão' : 'Nova Conversão de Unidade'}
              </DialogTitle>
              <DialogDescription>
                {editingConversion ? 'Edite a conversão de unidade.' : 
                  selectedUnit 
                    ? `Adicione uma conversão entre ${selectedUnit?.description} e outra unidade.`
                    : 'Adicione uma nova conversão entre duas unidades.'
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {(!selectedUnit && !editingConversion) && (
                <div>
                  <Label htmlFor="conv-unit-from">Converter de</Label>
                  <Select
                    value={newConversion.unit_from?.toString() || ''}
                    onValueChange={(value) => setNewConversion(prev => ({ ...prev, unit_from: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a unidade de origem" />
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
              )}
              {editingConversion && (
                <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                  Editando conversão: {units.find(u => u.id === newConversion.unit_from)?.description} → {units.find(u => u.id === newConversion.unit_to)?.description}
                </div>
              )}
              <div>
                <Label htmlFor="conv-unit-to">Converter para</Label>
                <Select
                  value={newConversion.unit_to?.toString() || ''}
                  onValueChange={(value) => setNewConversion(prev => ({ ...prev, unit_to: parseInt(value) }))}
                  disabled={!!editingConversion} // Não permitir alterar unidades na edição
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a unidade de destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.filter(unit => 
                      selectedUnit ? unit.id !== selectedUnit.id : unit.id !== newConversion.unit_from
                    ).map((unit) => (
                      <SelectItem key={unit.id} value={unit.id.toString()}>
                        {unit.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="conv-factor">Fator de Conversão</Label>
                <Input
                  id="conv-factor"
                  type="number"
                  step="0.001"
                  value={newConversion.factor || ''}
                  onChange={(e) => setNewConversion(prev => ({ ...prev, factor: parseFloat(e.target.value) }))}
                  placeholder="1.0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedUnit ? (
                    <>1 {selectedUnit.description} = {newConversion.factor} unidades de destino</>
                  ) : (
                    <>Fator de conversão entre as unidades selecionadas</>
                  )}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsConversionDialogOpen(false)
                    setSelectedUnit(null)
                    setEditingConversion(null)
                    setNewConversion({ unit_from: 0, unit_to: 0, factor: 1 })
                  }}
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
                <Button onClick={handleSaveConversion}>
                  <Save className="h-4 w-4" />
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}