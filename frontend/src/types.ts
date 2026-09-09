export type Location = {
  id: string
  name: string
  description: string | null
  parentLocationId: string | null
  locationType: string
  isInternalComponent: boolean
  color: string
  childCount: number
  itemCount: number
  isSystem: boolean
}

export type LocationInput = {
  name: string
  description: string
  parentLocationId: string | null
  locationType: string
  isInternalComponent: boolean
  color: string
}

export type Item = {
  id: string
  name: string
  locationId: string
  locationPath: string
  locationColor: string
  isCheckedOut: boolean
  activeCheckout: Checkout | null
  family: Family | null
  tags: Tag[]
  isConsumable: boolean
  consumableStatus: ConsumableStatus | null
}

export type ItemDetails = Item & {
  checkoutHistory: Checkout[]
}

export type Checkout = {
  id: string
  checkedOutAt: string
  returnedAt: string | null
  borrowerName: string
  notes: string | null
}

export type ConsumableStatus = 'low' | 'out'

export type Tag = {
  id: string
  name: string
}

export type Family = {
  id: string
  name: string
  parentFamilyId: string | null
}

export type FamilySummary = Family & {
  description: string | null
  childCount: number
  itemCount: number
}

export type ItemInput = {
  name: string
  locationId: string
  familyId: string | null
  tagIds: string[]
  isConsumable: boolean
  consumableStatus: ConsumableStatus | null
}

export type QuickAddInput = {
  namePattern: string
  startNumber: number
  endNumber: number
  locationId: string
  familyId: string | null
  tagIds: string[]
  isConsumable: boolean
  consumableStatus: ConsumableStatus | null
}
