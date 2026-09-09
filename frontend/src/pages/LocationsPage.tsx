import { useEffect, useState, type FormEvent } from 'react'
import { createLocation, deleteLocation, listLocations, updateLocation } from '../api'
import type { Location, LocationInput } from '../types'

type LocationsPageProps = { onNavigate: (path: string) => void }

const emptyInput: LocationInput = {
  name: '',
  description: '',
  parentLocationId: null,
  locationType: 'Other',
  isInternalComponent: false,
  color: '#728a77',
}

const locationColors = ['#728a77', '#5e7765', '#7b8fa3', '#9a7b62', '#a56b5d', '#8a7a9b', '#b08a4b', '#526158']

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

export function LocationsPage({ onNavigate }: LocationsPageProps) {
  const [locations, setLocations] = useState<Location[]>([])
  const [form, setForm] = useState<LocationInput>(emptyInput)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [fallbackName, setFallbackName] = useState('')
  const [savingFallback, setSavingFallback] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [colorPickerOpen, setColorPickerOpen] = useState(false)

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 4200)
    return () => window.clearTimeout(timer)
  }, [notice])

  async function load(signal?: AbortSignal) {
    const nextLocations = await listLocations(signal)
    setLocations(nextLocations)
    setFallbackName(nextLocations.find((location) => location.isSystem)?.name ?? '')
  }

  useEffect(() => {
    const controller = new AbortController()
    listLocations(controller.signal)
      .then((nextLocations) => {
        setLocations(nextLocations)
        setFallbackName(nextLocations.find((location) => location.isSystem)?.name ?? '')
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setError(reason instanceof Error ? reason.message : 'Could not load locations.')
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      if (editingLocationId) {
        await updateLocation(editingLocationId, form)
        await load()
        setNotice(`${form.name.trim()} was updated.`)
        setEditingLocationId(null)
        setForm(emptyInput)
        return
      }
      const created = await createLocation(form)
      await load()
      setNotice(`${form.name.trim()} was added.`)
      setForm({ ...emptyInput, parentLocationId: created.id })
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Could not create this location.')
    } finally {
      setSaving(false)
    }
  }

  function editLocation(location: Location) {
    setEditingLocationId(location.id)
    setForm({
      name: location.name,
      description: location.description ?? '',
      parentLocationId: location.parentLocationId,
      locationType: location.locationType,
      isInternalComponent: location.isInternalComponent,
      color: location.color,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function remove(location: Location) {
    const itemMessage = location.itemCount > 0 ? ` Its ${location.itemCount} item${location.itemCount === 1 ? '' : 's'} will move to Unorganised.` : ''
    if (!window.confirm(`Delete ${location.name}?${itemMessage}`)) return
    setError(null)
    setNotice(null)
    try {
      await deleteLocation(location.id)
      await load()
      setNotice(`${location.name} was deleted.${location.itemCount > 0 ? ' Its items were moved to Unorganised.' : ''}`)
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Could not delete this location.')
    }
  }

  async function renameFallback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fallback = locations.find((location) => location.isSystem)
    if (!fallback) return
    setSavingFallback(true)
    setError(null)
    setNotice(null)
    try {
      await updateLocation(fallback.id, {
        name: fallbackName,
        description: fallback.description ?? '',
        parentLocationId: null,
        locationType: 'System',
        isInternalComponent: false,
        color: fallback.color,
      })
      await load()
      setRenameOpen(false)
      setNotice(`The fallback location is now named ${fallbackName.trim()}.`)
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Could not rename the fallback location.')
    } finally {
      setSavingFallback(false)
    }
  }

  async function togglePlanVisibility(location: Location) {
    if (!location.parentLocationId) return
    setError(null)
    setNotice(null)
    try {
      await updateLocation(location.id, {
        name: location.name,
        description: location.description ?? '',
        parentLocationId: location.parentLocationId,
        locationType: location.locationType,
        isInternalComponent: !location.isInternalComponent,
        color: location.color,
      })
      await load()
      setNotice(`${location.name} will ${location.isInternalComponent ? 'now appear' : 'no longer appear'} in the space designer.`)
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Could not update floor plan visibility.')
    }
  }

  const byId = new Map(locations.map((location) => [location.id, location]))
  const parentLocation = form.parentLocationId ? byId.get(form.parentLocationId) : undefined
  const physicalLocations = locations.filter((location) => !location.isSystem)
  const visibleLocations = physicalLocations.filter((location) => {
    let parentId = location.parentLocationId
    while (parentId) {
      if (!expanded.has(parentId)) return false
      parentId = byId.get(parentId)?.parentLocationId ?? null
    }
    return true
  })

  return (
    <main className="app-main location-page">
      <button className="back-link" type="button" onClick={() => onNavigate('/')}><span aria-hidden="true">&larr;</span> Back to inventory</button>
      <section className="item-hero">
        <div>
          <p className="kicker">Inventory / Locations</p>
          <h1>Give everything<br /><em>a home.</em></h1>
          <p className="hero-copy">Create cabinets, shelves, boxes, and drawers at any depth.</p>
        </div>
      </section>

      <div className="location-layout">
        <form className="edit-card" onSubmit={save}>
           <div className="card-topline"><div><p className="kicker">{editingLocationId ? 'Edit location' : 'New location'}</p><h2>{editingLocationId ? 'Update it.' : 'Where is it?'}</h2></div></div>
          <div className="form-fields">
            <label className="field field--wide"><span>Name</span><input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Garage shelf" required maxLength={200} /></label>
             <label className="field"><span>Type</span><select value={form.locationType} onChange={(event) => setForm((current) => ({ ...current, locationType: event.target.value, isInternalComponent: Boolean(current.parentLocationId && ['Drawer', 'Shelf'].includes(event.target.value)) || current.isInternalComponent }))}><option>Building</option><option>Cabinet</option><option>Shelf</option><option>Container</option><option>Drawer</option><option>Other</option></select></label>
             <label className="field"><span>Inside <small>Optional</small></span><select value={form.parentLocationId ?? ''} onChange={(event) => setForm((current) => ({ ...current, parentLocationId: event.target.value || null, isInternalComponent: event.target.value ? (['Drawer', 'Shelf'].includes(current.locationType) || current.isInternalComponent) : false }))}><option value="">Top-level location</option>{physicalLocations.sort((a, b) => pathFor(a, byId).localeCompare(pathFor(b, byId))).map((location) => <option key={location.id} value={location.id}>{pathFor(location, byId)}</option>)}</select></label>
             <div className="field field--wide"><span>Colour</span><div className="color-picker"><button className="color-picker-button" type="button" style={{ backgroundColor: form.color }} aria-label="Open colour picker" onClick={() => setColorPickerOpen((current) => !current)} />{colorPickerOpen && <div className="color-picker-menu"><div className="color-swatches">{locationColors.map((color) => <button key={color} className={`color-swatch${form.color === color ? ' is-selected' : ''}`} type="button" style={{ backgroundColor: color }} aria-label={`Use colour ${color}`} onClick={() => { setForm((current) => ({ ...current, color })); setColorPickerOpen(false) }} />)}</div><label className="color-custom-control"><span aria-hidden="true">&#9998;</span> Custom colour<input className="color-input" type="color" value={form.color} onChange={(event) => { setForm((current) => ({ ...current, color: event.target.value })); setColorPickerOpen(false) }} aria-label="Custom colour" /></label>{parentLocation && <button className="copy-parent-color" type="button" onClick={() => { setForm((current) => ({ ...current, color: parentLocation.color })); setColorPickerOpen(false) }}>Copy parent colour</button>}</div>}</div></div>
            <label className="checkbox-field field--wide"><input type="checkbox" checked={form.isInternalComponent} disabled={!form.parentLocationId} onChange={(event) => setForm((current) => ({ ...current, isInternalComponent: event.target.checked }))} /><span><strong>Part of the parent location</strong><small>For drawers, shelves, and compartments built into a larger storage piece. These stay out of floor plans.</small></span></label>
            <label className="field field--wide"><span>Description <small>Optional</small></span><textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={3} maxLength={2000} placeholder="A detail that helps identify this place" /></label>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          {notice && <p className="toast" role="status">{notice}</p>}
           <div className="form-actions"><button className="secondary-button" type="button" onClick={() => editingLocationId ? (setEditingLocationId(null), setForm(emptyInput)) : onNavigate('/')}>Cancel</button><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving...' : editingLocationId ? 'Save location' : 'Add location'} <span aria-hidden="true">-&gt;</span></button></div>
        </form>

        <section className="location-index">
          <div className="card-topline"><div><p className="kicker">Current structure</p><h2>Your locations</h2></div><span className="result-count">{physicalLocations.length} places</span></div>
          {loading && <p className="state-message">Loading locations...</p>}
          {!loading && physicalLocations.length === 0 && <div className="location-empty"><strong>No physical locations yet.</strong><span>Items can still be saved in Unorganised.</span></div>}
           {!loading && physicalLocations.length > 0 && <div className="location-list">{visibleLocations.sort((a, b) => pathFor(a, byId).localeCompare(pathFor(b, byId))).map((location) => <div className="location-row" key={location.id}><button className="location-expand" type="button" aria-label={`${expanded.has(location.id) ? 'Collapse' : 'Expand'} ${location.name}`} onClick={() => location.childCount > 0 && setExpanded((current) => { const next = new Set(current); if (next.has(location.id)) next.delete(location.id); else next.add(location.id); return next })}>{location.childCount > 0 ? (expanded.has(location.id) ? '-' : '+') : ''}</button><span className="location-glyph" style={{ backgroundColor: location.color }} aria-hidden="true" /> <div><strong>{location.name}</strong><small>{location.locationType}</small></div><span className="location-row-actions">{location.parentLocationId && <button className="location-action" type="button" onClick={() => void togglePlanVisibility(location)}>{location.isInternalComponent ? 'Show on plan' : 'Hide from plan'}</button>}<button className="location-action" type="button" onClick={() => editLocation(location)}>Edit</button><button className="location-delete" type="button" onClick={() => void remove(location)} disabled={location.childCount > 0} title={location.childCount > 0 ? 'Move or delete child locations first' : 'Delete location'}>Delete</button></span></div>)}</div>}
           <div className="location-row unorganised-row">
             <span className="location-glyph location-glyph--system" style={{ backgroundColor: locations.find((location) => location.isSystem)?.color }} aria-hidden="true" />
             <div><strong>{fallbackName || 'Unorganised'}</strong></div>
             <span className="location-row-actions"><button className="location-rename" type="button" onClick={() => setRenameOpen(true)}>Rename</button></span>
           </div>
        </section>
      </div>
      {renameOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !savingFallback) setRenameOpen(false) }}><section className="bulk-modal" role="dialog" aria-modal="true" aria-labelledby="rename-location-title"><div className="bulk-modal-header"><div><p className="kicker">System fallback</p><h2 id="rename-location-title">Rename location</h2></div><button type="button" onClick={() => setRenameOpen(false)} disabled={savingFallback} aria-label="Close rename dialog">x</button></div><form onSubmit={renameFallback}><div className="bulk-modal-body"><label className="field" htmlFor="fallback-name"><span>Location name</span><input id="fallback-name" value={fallbackName} onChange={(event) => setFallbackName(event.target.value)} required maxLength={200} autoFocus /></label>{error && <p className="bulk-error" role="alert">{error}</p>}</div><div className="bulk-modal-actions"><button className="secondary-button" type="button" onClick={() => setRenameOpen(false)} disabled={savingFallback}>Cancel</button><button className="primary-button" type="submit" disabled={savingFallback}>{savingFallback ? 'Saving...' : 'Rename'}</button></div></form></section></div>}
    </main>
  )
}
