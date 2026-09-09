import { useState } from 'react'
import type { FamilySummary } from '../types'

type FamilyPickerProps = {
  families: FamilySummary[]
  value: string | null
  onChange: (familyId: string | null) => void
  onCreateFamily: (name: string, parentFamilyId: string | null) => Promise<FamilySummary>
}

function familyPath(family: FamilySummary, byId: Map<string, FamilySummary>) {
  const names = [family.name]
  let parentId = family.parentFamilyId
  const visited = new Set<string>()
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId)
    const parent = byId.get(parentId)
    if (!parent) break
    names.unshift(parent.name)
    parentId = parent.parentFamilyId
  }
  return names.join(' / ')
}

export function FamilyPicker({ families, value, onChange, onCreateFamily }: FamilyPickerProps) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [parentFamilyId, setParentFamilyId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const byId = new Map(families.map((family) => [family.id, family]))
  const selected = value ? byId.get(value) : undefined
  const filtered = families.filter((family) => familyPath(family, byId).toLowerCase().includes(search.trim().toLowerCase()))

  async function addFamily() {
    const name = search.trim()
    if (!name) {
      setError('Type a family name before adding one.')
      return
    }
    setCreating(true)
    setError(null)
    try {
      const family = await onCreateFamily(name, parentFamilyId)
      onChange(family.id)
      setSearch('')
      setOpen(false)
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Could not add that family.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="field family-field">
      <span>Family <small>Optional group</small></span>
      <div className={`family-picker${open ? ' family-picker--open' : ''}`}>
        <button className="family-value" type="button" onClick={() => setOpen((isOpen) => !isOpen)}>
          {selected ? familyPath(selected, byId) : 'Choose a family'}<span aria-hidden="true">{open ? '^' : 'v'}</span>
        </button>
        {open && (
          <div className="family-menu">
            <input value={search} onChange={(event) => { setSearch(event.target.value); setError(null) }} placeholder="Search families..." aria-label="Search families" autoFocus />
            <label className="family-parent">Nest under (optional)
              <select value={parentFamilyId ?? ''} onChange={(event) => setParentFamilyId(event.target.value || null)}>
                <option value="">Top-level family</option>
                {families.map((family) => <option key={family.id} value={family.id}>{familyPath(family, byId)}</option>)}
              </select>
            </label>
            <button className="add-option" type="button" onClick={() => void addFamily()} disabled={creating}><span>+</span> {creating ? 'Adding family...' : search.trim() ? `Add "${search.trim()}"` : 'Add a new family'}</button>
            <button className="family-option family-option--clear" type="button" onClick={() => { onChange(null); setOpen(false) }}>No family</button>
            {filtered.map((family) => <button className={`family-option${value === family.id ? ' is-selected' : ''}`} key={family.id} type="button" onClick={() => { onChange(family.id); setOpen(false); setSearch('') }}>{familyPath(family, byId)}<small>{family.itemCount} items</small></button>)}
            {filtered.length === 0 && <p className="menu-empty">No matching families. Add one above.</p>}
            {error && <p className="picker-error">{error}</p>}
          </div>
        )}
      </div>
      <p className="field-hint">Use families for groups such as 1/4 inch sockets or power tools.</p>
    </div>
  )
}
