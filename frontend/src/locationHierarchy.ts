import type { Location } from './types'

export function isLocationWithin(locationId: string, ancestorId: string, locations: Location[]) {
  const byId = new Map(locations.map((location) => [location.id, location]))
  let current = byId.get(locationId)
  const visited = new Set<string>()
  while (current && !visited.has(current.id)) {
    if (current.id === ancestorId) return true
    visited.add(current.id)
    current = current.parentLocationId ? byId.get(current.parentLocationId) : undefined
  }
  return false
}

export function locationPath(location: Location, locations: Location[]) {
  const byId = new Map(locations.map((candidate) => [candidate.id, candidate]))
  const names = [location.name]
  let parentId = location.parentLocationId
  const visited = new Set<string>()
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId)
    const parent = byId.get(parentId)
    if (!parent) break
    names.unshift(parent.name)
    parentId = parent.parentLocationId
  }
  return names.join(' / ')
}
