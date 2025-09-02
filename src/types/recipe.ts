export interface Recipe {
  id: number
  description: string
  efficiency?: number
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
export interface EventWithRecipeCost {
  id: number
  title: string
  customer: number
  date: string | null
  time: string | null
  duration: number | null
  location: string | null
  type: string | null
  status: string | null
  numguests: number | null
  cost: number | null
  price: number | null
  description: string | null
  customer_info?: {
    name: string
  }
  totalRecipeCost?: number
}