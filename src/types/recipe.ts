export interface Recipe {
  id: number
  description: string
}

export interface Item {
  id: number
  description: string
  unit_purch: number
  unit_use: number
  cost: number
  factor: number
}

export interface Unit {
  id: number
  description: string
}

export interface RecipeItem {
  recipe: number
  item: number
  qty: number
  item_detail?: Item
}