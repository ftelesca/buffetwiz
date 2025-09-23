export interface Product {
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
  isproduct?: boolean
}

export interface Unit {
  id: number
  description: string
}

export interface ProductItem {
  product: number
  item: number
  qty: number
  item_detail?: Item
}