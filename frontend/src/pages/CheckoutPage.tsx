import { useDeferredValue, useEffect, useRef, useState } from 'react'
import './CheckoutPage.css'
import { checkinItem, checkoutItem, getItemFeatures, listItems, listLocations } from '../api'
import { ItemTable } from '../components/ItemTable'
import { PageHeading } from '../components/PageHeading'
import { notifyInventoryChanged } from '../inventoryEvents'
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
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null)
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null)
  const [selectedBorrower, setSelectedBorrower] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [borrower, setBorrower] = useState('')
  const [notes, setNotes] = useState('')
  const [dialogMode, setDialogMode] = useState<'checkout' | 'checkin' | null>(null)
  const [mobileView, setMobileView] = useState<'in' | 'out'>('in')
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
    && (!selectedFamilyId || item.family?.id === selectedFamilyId)
    && (!selectedTagId || item.tags.some((tag) => tag.id === selectedTagId))
    && [item.name, item.family?.name ?? '', ...item.tags.map((tag) => tag.name)].some((value) => value.toLowerCase().includes(query)))
  const available = visibleItems.filter((item) => !item.isCheckedOut)
  const checkedOut = visibleItems.filter((item) => item.isCheckedOut && (!selectedBorrower || item.activeCheckout?.borrowerName === selectedBorrower))
  const selectedAvailable = available.filter((item) => selectedIds.has(item.id))
  const locationOptions = locations
    .map((location) => ({ location, path: locationPath(location, locations) }))
    .sort((a, b) => a.path.localeCompare(b.path))
  const familyById = new Map<string, NonNullable<Item['family']>>()
  items.forEach((item) => { if (item.family) familyById.set(item.family.id, item.family) })
  const familyOptions = [...familyById.values()].sort((a, b) => a.name.localeCompare(b.name))
  const tagById = new Map<string, Item['tags'][number]>()
  items.flatMap((item) => item.tags).forEach((tag) => tagById.set(tag.id, tag))
  const tagOptions = [...tagById.values()].sort((a, b) => a.name.localeCompare(b.name))
  const borrowerOptions = [...new Set(items.filter((item) => item.isCheckedOut && item.activeCheckout).map((item) => item.activeCheckout!.borrowerName))].sort((a, b) => a.localeCompare(b))

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
    if (updated.size > 0) notifyInventoryChanged()
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
       <PageHeading kicker="Check In/Out" actions={!loading && !loadError && enabled ? <div className="checkout-filters collection-controls">
           <select aria-label="Filter by container" id="checkout-location-filter" value={selectedLocationId ?? ''} disabled={busy} onChange={(event) => { setSelectedLocationId(event.target.value || null); setSelectedIds(new Set()) }}><option value="">All containers</option>{locationOptions.map(({ location, path }) => <option key={location.id} value={location.id}>{path}</option>)}</select>
            <select aria-label="Filter by family" id="checkout-family-filter" value={selectedFamilyId ?? ''} disabled={busy} onChange={(event) => { setSelectedFamilyId(event.target.value || null); setSelectedIds(new Set()) }}><option value="">All families</option>{familyOptions.map((family) => <option key={family.id} value={family.id}>{family.name}</option>)}</select>
            <select aria-label="Filter by tag" id="checkout-tag-filter" value={selectedTagId ?? ''} disabled={busy} onChange={(event) => { setSelectedTagId(event.target.value || null); setSelectedIds(new Set()) }}><option value="">All tags</option>{tagOptions.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}</select>
           <select aria-label="Filter by borrower" id="checkout-borrower-filter" value={selectedBorrower} disabled={busy || borrowerOptions.length === 0} onChange={(event) => { setSelectedBorrower(event.target.value); setSelectedIds(new Set()) }}><option value="">All borrowers</option>{borrowerOptions.map((borrower) => <option key={borrower} value={borrower}>{borrower}</option>)}</select>
         </div> : undefined} />
      {loading && <p className="state-message">Loading your items...</p>}
      {loadError && <p className="state-message state-message--error" role="alert">{loadError}</p>}
      {!loading && !loadError && !enabled && <p className="state-message">Check out is disabled for this toolbox.</p>}
      {!loading && !loadError && enabled && <>
         <section className="search-bar page-search" aria-label="Checkout search">
           <span className="search-icon" aria-hidden="true" />
           <label className="sr-only" htmlFor="checkout-search">Search items</label>
           <input id="checkout-search" type="search" placeholder="Search items, families, or tags..." value={search} disabled={busy} onChange={(event) => { setSearch(event.target.value); setSelectedIds(new Set()) }} />
          </section>
        {error && <p className="state-message state-message--error" role="alert">{error}</p>}
        <div className="checkout-mobile-switch" role="group" aria-label="Checkout view">
          <button className={mobileView === 'in' ? 'is-active' : ''} type="button" onClick={() => setMobileView('in')}>Currently in</button>
          <button className={mobileView === 'out' ? 'is-active' : ''} type="button" onClick={() => setMobileView('out')}>Checked out</button>
        </div>
        <div className={`checkout-grid checkout-grid--${mobileView}`}>
          {[false, true].map((returning) => {
            const panelItems = returning ? checkedOut : available
            const count = panelItems.filter((item) => selectedIds.has(item.id)).length
            const title = returning ? 'Checked out' : 'Currently in'
            return (
              <section className="inventory-card" aria-label={title} key={title}>
                <div className={`card-topline circulation-card-topline${returning ? ' circulation-card-topline--out' : ''}`}>
                  <div><h2>{title}</h2></div>
                  <span className="result-count">{panelItems.length} records</span>
                </div>
                <div className={`bulk-toolbar${count ? '' : ' bulk-toolbar--empty'}`}>
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
             <div className="bulk-modal-body">
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
