export interface Product {
  id: string
  description: string
  efficiency?: number
}

export interface Item {
  id: string
  description: string
  unit_purch: string
  unit_use: string
  cost: number
  factor: number
  isproduct?: boolean
}

export interface Unit {
  id: string
  description: string
}

export interface ProductItem {
  product: string
  item: string
  qty: number
  item_detail?: Item
}
export interface EventWithProductCost {
  id: string
  title: string
  customer: string
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
  totalProductCost?: number
}