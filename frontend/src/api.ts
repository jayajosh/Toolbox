import type { FamilySummary, ImportedItem, ImportItemInput, Item, ItemDetails, ItemInput, Location, LocationInput, QuickAddInput, Tag } from './types'

type ItemFeatures = { checkout: boolean; checkoutHistory: boolean }
type SpacePlan = { elements: unknown; measurementSettings: unknown; updatedAt: string }

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })

  if (!response.ok) {
    let detail = `Request failed (${response.status})`
    try {
      const body: unknown = await response.json()
      if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') {
        detail = body.error
      }
    } catch {
      // Keep the HTTP status when the server response is not JSON.
    }
    throw new Error(detail)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function listItems(search: string, signal?: AbortSignal) {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''
  return request<Item[]>(`/api/items${query}`, { signal })
}

export function listLocations(signal?: AbortSignal) {
  return request<Location[]>('/api/locations', { signal })
}

export function createLocation(input: LocationInput) {
  return request<{ id: string }>('/api/locations', { method: 'POST', body: JSON.stringify(input) })
}

export function updateLocation(id: string, input: LocationInput) {
  return request<Location>(`/api/locations/${id}`, { method: 'PUT', body: JSON.stringify(input) })
}

export function deleteLocation(id: string) {
  return request<void>(`/api/locations/${id}`, { method: 'DELETE' })
}

export function listTags(search = '', signal?: AbortSignal) {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''
  return request<Tag[]>(`/api/tags${query}`, { signal })
}

export function createTag(name: string) {
  return request<Tag>('/api/tags', { method: 'POST', body: JSON.stringify({ name }) })
}

export function deleteTag(id: string) {
  return request<void>(`/api/tags/${id}`, { method: 'DELETE' })
}

export function listFamilies(signal?: AbortSignal) {
  return request<FamilySummary[]>('/api/families', { signal })
}

export function createFamily(name: string, parentFamilyId: string | null = null) {
  return request<FamilySummary>('/api/families', {
    method: 'POST',
    body: JSON.stringify({ name, description: null, parentFamilyId }),
  })
}

export function getItem(id: string, signal?: AbortSignal) {
  return request<ItemDetails>(`/api/items/${id}`, { signal })
}

export function getItemFeatures(signal?: AbortSignal) {
  return request<ItemFeatures>('/api/items/features', { signal })
}

export function createItem(input: ItemInput) {
  return request<ItemDetails>('/api/items', { method: 'POST', body: JSON.stringify(input) })
}

export function quickAddItems(input: QuickAddInput) {
  return request<ItemDetails[]>('/api/items/quick-add', { method: 'POST', body: JSON.stringify(input) })
}

export function importItems(locationId: string, items: ImportItemInput[]) {
  return request<ImportedItem[]>('/api/items/import', {
    method: 'POST',
    body: JSON.stringify({ locationId, items }),
  })
}

export function updateItem(id: string, input: ItemInput) {
  return request<ItemDetails>(`/api/items/${id}`, { method: 'PUT', body: JSON.stringify(input) })
}

export function deleteItem(id: string) {
  return request<void>(`/api/items/${id}`, { method: 'DELETE' })
}

export function getSpacePlan(signal?: AbortSignal) {
  return request<SpacePlan>('/api/space-plan', { signal })
}

export function saveSpacePlan(elements: unknown[], measurementSettings: unknown) {
  return request<SpacePlan>('/api/space-plan', {
    method: 'PUT',
    body: JSON.stringify({ elements, measurementSettings }),
  })
}

export function checkoutItem(id: string, borrowerName: string, notes: string) {
  return request<ItemDetails>(`/api/items/${id}/checkout`, { method: 'POST', body: JSON.stringify({ borrowerName, notes: notes || null }) })
}

export function checkinItem(id: string, notes = '') {
  return request<ItemDetails>(`/api/items/${id}/checkin`, { method: 'POST', body: JSON.stringify({ notes: notes || null }) })
}
