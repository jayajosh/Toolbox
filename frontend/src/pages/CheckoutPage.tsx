import { useDeferredValue, useEffect, useRef, useState } from 'react'
import './CheckoutPage.css'
import { checkinItem, checkoutItem, getItemFeatures, listItems, listLocations } from '../api'
import { ItemTable } from '../components/ItemTable'
import { isLocationWithin, locationPath } from '../locationHierarchy'
import type { Item, Location } from '../types'

export function CheckoutPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [items, setItems] = useState<Item[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [enabled, setEnabled] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const deferredSearch = useDeferredValue(search)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [borrower, setBorrower] = useState('')
  const [notes, setNotes] = useState('')
  const [dialogMode, setDialogMode] = useState<'checkout' | 'checkin' | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([listItems('', controller.signal), listLocations(controller.signal), getItemFeatures(controller.signal)])
      .then(([nextItems, nextLocations, features]) => {
        setItems(nextItems)
        setLocations(nextLocations)
        setEnabled(features.checkout)
        setLoading(false)
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        setLoadError(reason instanceof Error ? reason.message : 'Could not load items.')
        setLoading(false)
      })
    return () => controller.abort()
  }, [])

  const query = deferredSearch.trim().toLowerCase()
  const visibleItems = items.filter((item) => (!selectedLocationId || isLocationWithin(item.locationId, selectedLocationId, locations))
    && [item.name, item.family?.name ?? '', ...item.tags.map((tag) => tag.name)].some((value) => value.toLowerCase().includes(query)))
  const available = visibleItems.filter((item) => !item.isCheckedOut)
  const checkedOut = visibleItems.filter((item) => item.isCheckedOut)
  const selectedAvailable = available.filter((item) => selectedIds.has(item.id))
  const locationOptions = locations
    .map((location) => ({ location, path: locationPath(location, locations) }))
    .sort((a, b) => a.path.localeCompare(b.path))

  function toggleItem(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll(panelItems: Item[]) {
    setSelectedIds((current) => {
      const next = new Set(current)
      const allSelected = panelItems.every((item) => current.has(item.id))
      panelItems.forEach((item) => {
        if (allSelected) next.delete(item.id)
        else next.add(item.id)
      })
      return next
    })
  }

  function openCheckout(item: Item) {
    setSelectedIds(new Set([item.id]))
    setError(null)
    setDialogMode('checkout')
    dialog.current?.showModal()
  }

  async function transfer(returning: boolean) {
    const selected = (returning ? checkedOut : available).filter((item) => selectedIds.has(item.id))
    if (busy || !enabled || !selected.length || (!returning && !borrower.trim())) return
    setBusy(true)
    setError(null)
    const results = await Promise.allSettled(selected.map((item) => returning
      ? checkinItem(item.id, notes)
      : checkoutItem(item.id, borrower.trim(), notes)))
    const updated = new Map<string, Item>()
    const failures: string[] = []
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') updated.set(result.value.id, result.value)
      else failures.push(`${selected[index]?.name ?? 'Item'}: ${result.reason instanceof Error ? result.reason.message : 'Please try again.'}`)
    })
    setItems((current) => current.map((item) => updated.get(item.id) ?? item))
    setSelectedIds((current) => new Set([...current].filter((id) => !updated.has(id))))
    if (failures.length) setError(`${failures.length} of ${selected.length} items could not be checked ${returning ? 'in' : 'out'}. ${failures.join(' ')}`)
    else {
      dialog.current?.close()
      setDialogMode(null)
      setBorrower('')
      setNotes('')
    }
    setBusy(false)
  }

  return (
    <main className="app-main">
       <section className="checkout-heading">
         <p className="kicker">Item availability</p>
       </section>
      {loading && <p className="state-message">Loading your items...</p>}
      {loadError && <p className="state-message state-message--error" role="alert">{loadError}</p>}
      {!loading && !loadError && !enabled && <p className="state-message">Check out is disabled for this toolbox.</p>}
      {!loading && !loadError && enabled && <>
         <section className="search-bar" aria-label="Checkout search">
          <span className="search-icon" aria-hidden="true" />
          <label className="sr-only" htmlFor="checkout-search">Search items</label>
          <input id="checkout-search" type="search" placeholder="Search items, families, or tags..." value={search} disabled={busy} onChange={(event) => { setSearch(event.target.value); setSelectedIds(new Set()) }} />
         </section>
         <div className="checkout-filters collection-controls">
           <label className="sr-only" htmlFor="checkout-location-filter">Filter by container</label>
           <select id="checkout-location-filter" value={selectedLocationId ?? ''} disabled={busy} onChange={(event) => { setSelectedLocationId(event.target.value || null); setSelectedIds(new Set()) }}>
             <option value="">All containers</option>
             {locationOptions.map(({ location, path }) => <option key={location.id} value={location.id}>{path}</option>)}
           </select>
         </div>
        {error && <p className="state-message state-message--error" role="alert">{error}</p>}
        <div className="checkout-grid">
          {[false, true].map((returning) => {
            const panelItems = returning ? checkedOut : available
            const count = panelItems.filter((item) => selectedIds.has(item.id)).length
            const title = returning ? 'Checked out' : 'Currently in'
            return (
              <section className="inventory-card" aria-label={title} key={title}>
                <div className="card-topline">
                  <div><p className="kicker">{returning ? 'Away from the toolbox' : 'Ready to borrow'}</p><h2>{title}</h2></div>
                  <span className="result-count">{panelItems.length} records</span>
                </div>
                <div className="bulk-toolbar">
                  <span className="result-count">{count} selected</span>
                  <button type="button" disabled={!count || busy || search !== deferredSearch} onClick={() => {
                    setError(null)
                    setDialogMode(returning ? 'checkin' : 'checkout')
                    dialog.current?.showModal()
                  }}>{busy ? 'Updating...' : returning ? 'Check in selected' : 'Check out selected'}</button>
                </div>
                 <ItemTable items={panelItems} selectedItemIds={selectedIds} onToggleItem={toggleItem} onToggleAll={() => toggleAll(panelItems)} onNavigate={onNavigate} onItemClick={returning ? undefined : openCheckout} showStatus={false} disabled={busy || search !== deferredSearch} selectAllLabel={returning ? 'Select all checked-out items' : 'Select all available items'} locationHeader={returning ? 'Checked out to' : 'Container'} getLocationText={returning ? (item) => item.activeCheckout?.borrowerName ?? 'Unknown' : undefined} />
                {panelItems.length === 0 && <p className="state-message">{query ? 'No matching items.' : returning ? 'No items are checked out.' : 'No items are currently in.'}</p>}
              </section>
            )
          })}
        </div>
        <dialog ref={dialog} className="bulk-modal checkout-dialog" aria-labelledby="checkout-dialog-title" onCancel={(event) => { if (busy) event.preventDefault() }}>
          <form onSubmit={(event) => { event.preventDefault(); void transfer(dialogMode === 'checkin') }}>
             <div className="bulk-modal-header"><div><p className="kicker">Item {dialogMode === 'checkin' ? 'check in' : 'checkout'}</p><h2 id="checkout-dialog-title">{dialogMode === 'checkin' ? 'Return selected items?' : selectedAvailable.length === 1 ? 'Who is taking it?' : 'Check out items'}</h2></div><button type="button" aria-label="Close transfer dialog" disabled={busy} onClick={() => { dialog.current?.close(); setDialogMode(null) }}>x</button></div>
             <div className="bulk-modal-body checkout-fields">
              {dialogMode !== 'checkin' && <label className="field"><span>Borrower</span><input autoFocus required maxLength={200} value={borrower} disabled={busy} onChange={(event) => setBorrower(event.target.value)} placeholder="Who is taking these items?" /></label>}
              <label className="field"><span>Notes <small>Optional</small></span><textarea autoFocus={dialogMode === 'checkin'} rows={3} maxLength={2000} value={notes} disabled={busy} onChange={(event) => setNotes(event.target.value)} placeholder={dialogMode === 'checkin' ? 'Return condition or detail' : 'Project or return detail'} /></label>
              {error && <p className="bulk-error" role="alert">{error}</p>}
             </div>
             <div className="bulk-modal-actions"><button className="secondary-button" type="button" disabled={busy} onClick={() => { dialog.current?.close(); setDialogMode(null) }}>Cancel</button><button className="primary-button" type="submit" disabled={busy || (dialogMode !== 'checkin' && (!borrower.trim() || !selectedAvailable.length))}>{busy ? 'Updating...' : dialogMode === 'checkin' ? 'Check in items' : selectedAvailable.length === 1 ? 'Check out' : 'Check out items'}</button></div>
          </form>
        </dialog>
      </>}
    </main>
  )
}
