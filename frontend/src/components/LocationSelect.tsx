import type { Location } from '../types'

type LocationSelectProps = {
  locations: Location[]
  value: string
  onChange: (value: string) => void
}

function pathFor(location: Location, byId: Map<string, Location>) {
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

export function LocationSelect({ locations, value, onChange }: LocationSelectProps) {
  const byId = new Map(locations.map((location) => [location.id, location]))
  return (
    <label className="field">
      <span>Storage container</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} required>
        <option value="">Choose a container</option>
        {locations
          .slice()
          .sort((a, b) => pathFor(a, byId).localeCompare(pathFor(b, byId)))
          .map((location) => (
            <option key={location.id} value={location.id}>{pathFor(location, byId)}</option>
          ))}
      </select>
    </label>
  )
}
