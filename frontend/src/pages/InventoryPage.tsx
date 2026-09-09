import { useDeferredValue, useEffect, useState, type CSSProperties } from 'react'
import { checkoutItem, deleteItem, listFamilies, listItems, listLocations, listTags, updateItem } from '../api'
import { MapPanel } from '../components/MapPanel'
import type { FamilySummary, Item, ItemInput, Location, Tag } from '../types'

type InventoryPageProps = { onNavigate: (path: string) => void }
type BulkModal = 'move' | 'delete' | 'family' | 'tags' | 'checkout'

function isUnder(item: Item, locationId: string, locations: Location[]) {
  const byId = new Map(locations.map((location) => [location.id, location]))
  let current = byId.get(item.locationId)
  const visited = new Set<string>()
  while (current && !visited.has(current.id)) {
    if (current.id === locationId) return true
    visited.add(current.id)
    current = current.parentLocationId ? byId.get(current.parentLocationId) : undefined
  }
  return false
}

function pathFor<T extends { id: string; name: string }>(entry: T, entries: T[], parentIdFor: (entry: T) => string | null) {
  const byId = new Map(entries.map((candidate) => [candidate.id, candidate]))
  const names = [entry.name]
  let parentId = parentIdFor(entry)
  const visited = new Set<string>()
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId)
    const parent = byId.get(parentId)
    if (!parent) break
    names.unshift(parent.name)
    parentId = parentIdFor(parent)
  }
  return names.join(' / ')
}

function inputFor(item: Item): ItemInput {
  return {
    name: item.name,
    locationId: item.locationId,
    familyId: item.family?.id ?? null,
    tagIds: item.tags.map((tag) => tag.id),
    isConsumable: item.isConsumable,
    consumableStatus: item.consumableStatus,
  }
}

export function InventoryPage({ onNavigate }: InventoryPageProps) {
  const [items, setItems] = useState<Item[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [families, setFamilies] = useState<FamilySummary[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null)
  const [loadedSearch, setLoadedSearch] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const [bulkLocationId, setBulkLocationId] = useState('')
  const [bulkFamilyId, setBulkFamilyId] = useState('')
  const [bulkTagIds, setBulkTagIds] = useState<string[]>([])
  const [borrowerName, setBorrowerName] = useState('')
  const [checkoutNotes, setCheckoutNotes] = useState('')
  const [bulkAction, setBulkAction] = useState<string | null>(null)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [bulkModal, setBulkModal] = useState<BulkModal | null>(null)
  const loading = loadedSearch !== deferredSearch

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      listItems(deferredSearch, controller.signal),
      listLocations(controller.signal),
      listFamilies(controller.signal),
      listTags('', controller.signal),
    ])
      .then(([nextItems, nextLocations, nextFamilies, nextTags]) => {
        setItems(nextItems)
        setLocations(nextLocations)
        setFamilies(nextFamilies)
        setTags(nextTags)
        setSelectedItemIds((current) => new Set([...current].filter((id) => nextItems.some((item) => item.id === id))))
        setError(null)
        setLoadedSearch(deferredSearch)
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setError(reason instanceof Error ? reason.message : 'Could not load the inventory.')
        setLoadedSearch(deferredSearch)
      })
    return () => controller.abort()
  }, [deferredSearch])

  useEffect(() => {
    if (!bulkModal) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !bulkAction) {
        setBulkModal(null)
        setBulkError(null)
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [bulkAction, bulkModal])

  const locationItems = selectedLocationId
    ? items.filter((item) => isUnder(item, selectedLocationId, locations))
    : items
  const visibleItems = selectedFamilyId
    ? locationItems.filter((item) => item.family?.id === selectedFamilyId)
    : locationItems
  const checkedOut = visibleItems.filter((item) => item.isCheckedOut).length
  const selectedItems = items.filter((item) => selectedItemIds.has(item.id))
  const allVisibleSelected = visibleItems.length > 0 && visibleItems.every((item) => selectedItemIds.has(item.id))
  const locationOptions = locations
    .map((location) => ({ location, path: pathFor(location, locations, (entry) => entry.parentLocationId) }))
    .sort((a, b) => a.path.localeCompare(b.path))
  const familyOptions = families
    .map((family) => ({ family, path: pathFor(family, families, (entry) => entry.parentFamilyId) }))
    .sort((a, b) => a.path.localeCompare(b.path))

  function toggleItem(itemId: string) {
    setSelectedItemIds((current) => {
      const next = new Set(current)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
    setBulkError(null)
  }

  function toggleVisibleItems() {
    setSelectedItemIds((current) => {
      const next = new Set(current)
      if (allVisibleSelected) visibleItems.forEach((item) => next.delete(item.id))
      else visibleItems.forEach((item) => next.add(item.id))
      return next
    })
    setBulkError(null)
  }

  function openBulkModal(modal: BulkModal) {
    setBulkModal(modal)
    setBulkError(null)
  }

  function closeBulkModal() {
    if (bulkAction) return
    setBulkModal(null)
    setBulkError(null)
  }

  async function bulkUpdate(action: string, input: (item: Item) => ItemInput) {
    setBulkAction(action)
    setBulkError(null)
    const results = await Promise.allSettled(selectedItems.map((item) => updateItem(item.id, input(item))))
    const updated = new Map<string, Item>()
    const failedIds: string[] = []
    results.forEach((result, index) => {
      const item = selectedItems[index]
      if (!item) return
      if (result.status === 'fulfilled') updated.set(result.value.id, result.value)
      else failedIds.push(item.id)
    })
    setItems((current) => current.map((item) => updated.get(item.id) ?? item))
    setSelectedItemIds(new Set(failedIds))
    if (failedIds.length) setBulkError(`${failedIds.length} of ${selectedItems.length} items could not be updated.`)
    else setBulkModal(null)
    setBulkAction(null)
  }

  async function bulkDelete() {
    setBulkAction('delete')
    setBulkError(null)
    const results = await Promise.allSettled(selectedItems.map((item) => deleteItem(item.id)))
    const deletedIds = new Set<string>()
    const failedIds: string[] = []
    results.forEach((result, index) => {
      const item = selectedItems[index]
      if (!item) return
      if (result.status === 'fulfilled') deletedIds.add(item.id)
      else failedIds.push(item.id)
    })
    setItems((current) => current.filter((item) => !deletedIds.has(item.id)))
    setSelectedItemIds(new Set(failedIds))
    if (failedIds.length) setBulkError(`${failedIds.length} of ${selectedItems.length} items could not be deleted. Checked-out items must be returned first.`)
    else setBulkModal(null)
    setBulkAction(null)
  }

  async function bulkCheckout() {
    setBulkAction('checkout')
    setBulkError(null)
    const available = selectedItems.filter((item) => !item.isCheckedOut)
    const results = await Promise.allSettled(available.map((item) => checkoutItem(item.id, borrowerName, checkoutNotes)))
    const updated = new Map<string, Item>()
    const failedIds: string[] = selectedItems.filter((item) => item.isCheckedOut).map((item) => item.id)
    results.forEach((result, index) => {
      const item = available[index]
      if (!item) return
      if (result.status === 'fulfilled') updated.set(result.value.id, result.value)
      else failedIds.push(item.id)
    })
    setItems((current) => current.map((item) => updated.get(item.id) ?? item))
    setSelectedItemIds(new Set(failedIds))
    if (failedIds.length) setBulkError(`${failedIds.length} item${failedIds.length === 1 ? '' : 's'} could not be checked out. Already checked-out items were skipped.`)
    else setBulkModal(null)
    setBulkAction(null)
  }

  return (
    <main className="app-main">
      <section className="inventory-hero">
        <div>
          <p className="kicker">Inventory / Overview</p>
          <h1>Find the thing.<br /><em>Know its place.</em></h1>
          <p className="hero-copy">A clear view of everything you keep, from the house to the smallest drawer.</p>
        </div>
        <button className="primary-button hero-action" type="button" onClick={() => onNavigate('/items/new')}>
          <span className="plus">+</span> Add an item
        </button>
      </section>

      <section className="search-bar" aria-label="Inventory search">
        <span className="search-icon" aria-hidden="true" />
        <label className="sr-only" htmlFor="inventory-search">Search inventory</label>
        <input
          id="inventory-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search items, families, or tags..."
          type="search"
        />
      </section>

      <section className="stats-row" aria-label="Inventory summary">
        <div><span className="stat-value">{visibleItems.length}</span><span className="stat-label">Items in view</span></div>
        <div><span className="stat-value">{locations.length}</span><span className="stat-label">Locations mapped</span></div>
        <div><span className="stat-value stat-value--warm">{checkedOut}</span><span className="stat-label">Checked out</span></div>
        <div className="stats-note"><span className="pulse-dot" /> Live from your toolbox</div>
      </section>

      <section className="workspace-grid">
        <div className="inventory-card">
          <div className="card-topline inventory-card-heading">
            <div>
              <p className="kicker">Current collection</p>
              <h2>{selectedLocationId ? 'Items in this space' : 'All items'}</h2>
            </div>
            <div className="collection-controls">
              {visibleItems.length > 0 && <label className="select-all"><input type="checkbox" checked={allVisibleSelected} onChange={toggleVisibleItems} /> Select all</label>}
              <label className="sr-only" htmlFor="family-filter">Filter by family</label>
              <select id="family-filter" value={selectedFamilyId ?? ''} onChange={(event) => setSelectedFamilyId(event.target.value || null)}>
                <option value="">All families</option>
                {families.map((family) => <option key={family.id} value={family.id}>{family.name} ({family.itemCount})</option>)}
              </select>
              <span className="result-count">{visibleItems.length} records</span>
            </div>
          </div>
          {selectedItems.length > 0 && (
            <div className="bulk-toolbar" aria-label={`${selectedItems.length} selected items`}>
              <button type="button" onClick={() => openBulkModal('move')}>Move location</button>
              <button type="button" onClick={() => openBulkModal('checkout')}>Check out</button>
              <button type="button" onClick={() => openBulkModal('delete')}>Delete</button>
              <button type="button" onClick={() => openBulkModal('family')}>Add to family</button>
              <button type="button" onClick={() => openBulkModal('tags')}>Add tags</button>
            </div>
          )}
          {loading && <p className="state-message">Loading your inventory...</p>}
          {error && <p className="state-message state-message--error">{error}</p>}
          {!loading && !error && visibleItems.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon">~</span>
              <h3>{search ? 'Nothing matches that search.' : 'Your inventory is ready for its first item.'}</h3>
              <p>{search ? 'Try a different item name, family, or tag.' : 'Start with the item you are most likely to look for.'}</p>
              {!search && <button className="secondary-button" type="button" onClick={() => onNavigate('/items/new')}>Add your first item</button>}
            </div>
          )}
           {!loading && !error && visibleItems.length > 0 && (
             <div className="item-list">
               <div className="item-column-head" aria-hidden="true"><span /><span>Item</span><span>Location</span><span>Status</span><span /></div>
               {visibleItems.map((item) => (
                <div className={`item-row${selectedItemIds.has(item.id) ? ' is-selected' : ''}`} key={item.id}>
                  <input className="item-select" type="checkbox" checked={selectedItemIds.has(item.id)} onChange={() => toggleItem(item.id)} aria-label={`Select ${item.name}`} />
                  <button className="item-row-main" type="button" onClick={() => onNavigate(`/items/${item.id}`)}>
                    <span className="item-info">
                      <strong>{item.name}</strong>
                      {item.family?.name && <span>{item.family.name}</span>}
                      {item.tags.length > 0 && <span className="item-tags">{item.tags.map((tag) => <span className="item-tag-chip" key={tag.id}>{tag.name}</span>)}</span>}
                    </span>
                    <span className="item-location" style={{ '--location-color': item.locationColor } as CSSProperties}><span className="pin" aria-hidden="true" />{item.locationPath}</span>
                    <span className={`item-status ${item.isCheckedOut ? 'item-status--out' : ''}`}>
                      {item.isCheckedOut ? 'Out' : 'Here'}
                      {item.isConsumable && <small>{item.consumableStatus === 'low' ? 'Low stock' : item.consumableStatus === 'out' ? 'Out of stock' : 'Stock not set'}</small>}
                    </span>
                    <span className="row-arrow" aria-hidden="true">&gt;</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <MapPanel
           locations={locations}
           selectedLocationId={selectedLocationId}
           onSelectLocation={setSelectedLocationId}
           onAddLocation={() => onNavigate('/locations')}
           onDesignSpace={() => onNavigate('/designer')}
         />
      </section>
      {bulkModal && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeBulkModal() }}>
          <section className="bulk-modal" role="dialog" aria-modal="true" aria-labelledby="bulk-modal-title">
            <div className="bulk-modal-header">
              <div>
                <p className="kicker">{selectedItems.length} selected</p>
                <h2 id="bulk-modal-title">{bulkModal === 'move' ? 'Move location' : bulkModal === 'delete' ? 'Delete items?' : bulkModal === 'family' ? 'Add to family' : bulkModal === 'checkout' ? 'Check out items' : 'Add tags'}</h2>
              </div>
              <button type="button" onClick={closeBulkModal} disabled={bulkAction !== null} aria-label="Close bulk edit">x</button>
            </div>
            <div className="bulk-modal-body">
              {bulkModal === 'move' && <label className="field" htmlFor="bulk-location">New location<select id="bulk-location" value={bulkLocationId} onChange={(event) => setBulkLocationId(event.target.value)} autoFocus><option value="">Choose a location</option>{locationOptions.map(({ location, path }) => <option key={location.id} value={location.id}>{path}</option>)}</select></label>}
              {bulkModal === 'family' && <label className="field" htmlFor="bulk-family">Family<select id="bulk-family" value={bulkFamilyId} onChange={(event) => setBulkFamilyId(event.target.value)} autoFocus><option value="">Choose a family</option>{familyOptions.map(({ family, path }) => <option key={family.id} value={family.id}>{path}</option>)}</select></label>}
              {bulkModal === 'checkout' && <div className="checkout-fields"><label className="field"><span>Borrower</span><input value={borrowerName} onChange={(event) => setBorrowerName(event.target.value)} autoFocus required maxLength={200} placeholder="Who is taking these items?" /></label><label className="field"><span>Notes <small>Optional</small></span><textarea value={checkoutNotes} onChange={(event) => setCheckoutNotes(event.target.value)} rows={3} maxLength={2000} placeholder="Project or return detail" /></label></div>}
              {bulkModal === 'tags' && <div className="modal-tag-list">{tags.length ? tags.map((tag, index) => <label key={tag.id}><input type="checkbox" checked={bulkTagIds.includes(tag.id)} onChange={() => setBulkTagIds((current) => current.includes(tag.id) ? current.filter((id) => id !== tag.id) : [...current, tag.id])} autoFocus={index === 0} /> <span>{tag.name}</span></label>) : <p>No tags are available yet.</p>}</div>}
              {bulkModal === 'delete' && <p className="delete-warning">This permanently deletes {selectedItems.length === 1 ? 'this item' : `these ${selectedItems.length} items`}. Checked-out items must be returned first.</p>}
              {bulkError && <p className="bulk-error" role="alert">{bulkError}</p>}
            </div>
            <div className="bulk-modal-actions">
              <button className="secondary-button" type="button" onClick={closeBulkModal} disabled={bulkAction !== null}>Cancel</button>
              {bulkModal === 'move' && <button className="primary-button" type="button" disabled={!bulkLocationId || bulkAction !== null} onClick={() => void bulkUpdate('move', (item) => ({ ...inputFor(item), locationId: bulkLocationId }))}>{bulkAction === 'move' ? 'Moving...' : 'Move items'}</button>}
              {bulkModal === 'family' && <button className="primary-button" type="button" disabled={!bulkFamilyId || bulkAction !== null} onClick={() => void bulkUpdate('family', (item) => ({ ...inputFor(item), familyId: bulkFamilyId }))}>{bulkAction === 'family' ? 'Adding...' : 'Add to family'}</button>}
              {bulkModal === 'checkout' && <button className="primary-button" type="button" disabled={!borrowerName.trim() || bulkAction !== null} onClick={() => void bulkCheckout()}>{bulkAction === 'checkout' ? 'Checking out...' : 'Check out items'}</button>}
              {bulkModal === 'tags' && <button className="primary-button" type="button" disabled={!bulkTagIds.length || bulkAction !== null} onClick={() => void bulkUpdate('tags', (item) => ({ ...inputFor(item), tagIds: [...new Set([...item.tags.map((tag) => tag.id), ...bulkTagIds])] }))}>{bulkAction === 'tags' ? 'Adding...' : 'Add tags'}</button>}
              {bulkModal === 'delete' && <button className="danger-button danger-button--solid" type="button" disabled={bulkAction !== null} onClick={() => void bulkDelete()}>{bulkAction === 'delete' ? 'Deleting...' : 'Delete items'}</button>}
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
