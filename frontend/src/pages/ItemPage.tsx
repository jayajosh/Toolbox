import { useEffect, useState, type FormEvent } from 'react'
import { checkinItem, checkoutItem, createFamily, createItem, createTag, deleteTag, getItem, listFamilies, listLocations, listTags, quickAddItems, updateItem } from '../api'
import { FamilyPicker } from '../components/FamilyPicker'
import { LocationSelect } from '../components/LocationSelect'
import { MapPanel } from '../components/MapPanel'
import { TagPicker } from '../components/TagPicker'
import type { FamilySummary, ItemDetails, ItemInput, Location, Tag } from '../types'

type ItemPageProps = { id?: string; onNavigate: (path: string) => void }

const emptyInput: ItemInput = { name: '', locationId: '', familyId: null, tagIds: [], isConsumable: false, consumableStatus: null }

export function ItemPage({ id, onNavigate }: ItemPageProps) {
  const editing = Boolean(id)
  const [locations, setLocations] = useState<Location[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [families, setFamilies] = useState<FamilySummary[]>([])
  const [item, setItem] = useState<ItemDetails | null>(null)
  const [form, setForm] = useState<ItemInput>(emptyInput)
  const [loading, setLoading] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quickAdd, setQuickAdd] = useState(false)
  const [quickPattern, setQuickPattern] = useState('{n}')
  const [quickStart, setQuickStart] = useState('10')
  const [quickEnd, setQuickEnd] = useState('24')
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [borrowerName, setBorrowerName] = useState('')
  const [checkoutNotes, setCheckoutNotes] = useState('')

  const startNumber = Number(quickStart)
  const endNumber = Number(quickEnd)
  const quickRangeValid = Number.isInteger(startNumber)
    && Number.isInteger(endNumber)
    && startNumber <= endNumber
    && endNumber - startNumber + 1 <= 100
  const quickCount = quickRangeValid ? endNumber - startNumber + 1 : 0
  const quickName = quickPattern.trim().includes('{n}')
    ? quickPattern.trim().replaceAll('{n}', String(startNumber))
    : `${quickPattern.trim()} ${startNumber}`.trim()

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      listLocations(controller.signal),
      listTags('', controller.signal),
      listFamilies(controller.signal),
      id ? getItem(id, controller.signal) : Promise.resolve(null),
    ])
      .then(([nextLocations, nextTags, nextFamilies, nextItem]) => {
        setLocations(nextLocations)
        setTags(nextTags)
        setFamilies(nextFamilies)
        if (nextItem) {
          setItem(nextItem)
          setForm({
            name: nextItem.name,
            locationId: nextItem.locationId,
            familyId: nextItem.family?.id ?? null,
            tagIds: nextItem.tags.map((tag) => tag.id),
            isConsumable: nextItem.isConsumable,
            consumableStatus: nextItem.consumableStatus,
          })
        } else {
          setForm((current) => ({ ...current, locationId: nextLocations.find((location) => location.isSystem)?.id ?? '' }))
        }
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setError(reason instanceof Error ? reason.message : 'Could not load this item.')
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [id])

  function updateField<K extends keyof ItemInput>(field: K, value: ItemInput[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (quickAdd) {
        if (!quickRangeValid || !quickPattern.trim()) {
          throw new Error('Enter a valid name pattern and range of up to 100 items.')
        }
        await quickAddItems({
          namePattern: quickPattern,
          startNumber,
          endNumber,
          locationId: form.locationId,
          familyId: form.familyId,
          tagIds: form.tagIds,
          isConsumable: form.isConsumable,
          consumableStatus: form.consumableStatus,
        })
        onNavigate('/')
      } else {
        const saved = id ? await updateItem(id, form) : await createItem(form)
        onNavigate(`/items/${saved.id}`)
      }
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Could not save this item.')
    } finally {
      setSaving(false)
    }
  }

  async function checkOut() {
    if (!item || !borrowerName.trim()) return
    try {
      setSaving(true)
      setItem(await checkoutItem(item.id, borrowerName, checkoutNotes))
      setCheckoutOpen(false)
      setBorrowerName('')
      setCheckoutNotes('')
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Could not check out this item.')
    } finally { setSaving(false) }
  }

  async function checkIn() {
    if (!item) return
    try { setSaving(true); setItem(await checkinItem(item.id)) }
    catch (reason: unknown) { setError(reason instanceof Error ? reason.message : 'Could not check in this item.') }
    finally { setSaving(false) }
  }

  if (loading) return <main className="app-main"><p className="state-message">Loading item...</p></main>

  return (
    <main className="app-main item-page">
      <button className="back-link" type="button" onClick={() => onNavigate('/')}>
        <span aria-hidden="true">&larr;</span> Back to inventory
      </button>
      <section className="item-hero">
        <div>
          <p className="kicker">{editing ? 'Inventory / Edit item' : 'Inventory / New item'}</p>
          {!editing && <h1>Give it a place<br /><em>to land.</em></h1>}
          <p className="hero-copy">{editing ? 'A precise record makes the next search a quick one.' : 'Add one thing now and give it a useful home, family, and tags.'}</p>
        </div>
        <div className="item-actions">
          {!editing && <button className="secondary-button" type="button" onClick={() => setQuickAdd((current) => !current)}>{quickAdd ? 'Single item' : 'Quick add a range'}</button>}
        </div>
      </section>

      <div className="form-layout">
        <form className="edit-card" onSubmit={save}>
          <div className="card-topline">
            <div><p className="kicker">Item record</p><h2>{quickAdd ? 'Add a range' : 'What is it?'}</h2></div>
            <span className="form-step">01 / 02</span>
          </div>
          <div className="form-fields">
            {quickAdd ? <>
              <label className="field field--wide"><span>Name pattern <small>Use {'{n}'} where the number goes</small></span><input value={quickPattern} onChange={(event) => setQuickPattern(event.target.value)} placeholder={'e.g. mm 1/4" sockets {n}'} required maxLength={200} /></label>
              <label className="field"><span>From</span><input type="number" step={1} value={quickStart} onChange={(event) => setQuickStart(event.target.value)} required /></label>
              <label className="field"><span>To</span><input type="number" step={1} value={quickEnd} onChange={(event) => setQuickEnd(event.target.value)} required /></label>
              <p className={`quick-preview${quickPattern.trim() && !quickRangeValid ? ' quick-preview--error' : ''}`}>{quickPattern.trim() && quickRangeValid ? `${quickCount} items: ${quickName} through ${quickPattern.trim().includes('{n}') ? quickPattern.trim().replaceAll('{n}', String(endNumber)) : `${quickPattern.trim()} ${endNumber}`}` : 'Choose a valid range of up to 100 items.'}</p>
            </> : <label className="field field--wide"><span>Name</span><input value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="e.g. Torque wrench" required maxLength={200} /></label>}
            <LocationSelect locations={locations} value={form.locationId} onChange={(value) => updateField('locationId', value)} />
            <FamilyPicker families={families} value={form.familyId} onChange={(value) => updateField('familyId', value)} onCreateFamily={async (name, parentFamilyId) => { const family = await createFamily(name, parentFamilyId); setFamilies((current) => [...current, family]); return family }} />
             <TagPicker tags={tags} selectedTagIds={form.tagIds} onChange={(value) => updateField('tagIds', value)} onCreateTag={async (name) => { const tag = await createTag(name); setTags((current) => [...current, tag]); return tag }} onDeleteTag={async (tag) => { await deleteTag(tag.id); setTags((current) => current.filter((candidate) => candidate.id !== tag.id)) }} />
            <label className="checkbox-field field--wide">
              <input type="checkbox" checked={form.isConsumable} onChange={(event) => setForm((current) => ({ ...current, isConsumable: event.target.checked, consumableStatus: event.target.checked ? current.consumableStatus : null }))} />
              <span><strong>Consumable item</strong><small>Track whether stock is low or out.</small></span>
            </label>
            {form.isConsumable && <label className="field"><span>Stock status</span><select value={form.consumableStatus ?? ''} onChange={(event) => updateField('consumableStatus', event.target.value === '' ? null : event.target.value as 'low' | 'out')}><option value="">Not set</option><option value="low">Low</option><option value="out">Out</option></select></label>}
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions">
            <button className="secondary-button" type="button" onClick={() => onNavigate('/')}>Cancel</button>
            <button className="primary-button" type="submit" disabled={saving || locations.length === 0 || (quickAdd && !quickRangeValid)}>{saving ? 'Adding...' : editing ? 'Save changes' : quickAdd ? `Add ${quickCount} items` : 'Add to inventory'} <span aria-hidden="true">-&gt;</span></button>
          </div>
         </form>
         <aside className="record-aside">
           {item && <div className={`checkout-card${item.isCheckedOut ? ' checkout-card--out' : ''}`}>
             <p className="kicker">Item availability</p>
             <div className="checkout-card-status"><span />{item.isCheckedOut ? 'Currently checked out' : 'Currently here'}</div>
             {item.isCheckedOut && item.activeCheckout && <p className="checkout-card-detail">With {item.activeCheckout.borrowerName}</p>}
             {item.isCheckedOut
               ? <button className="primary-button" type="button" onClick={() => void checkIn()} disabled={saving}>Check in</button>
               : <button className="primary-button" type="button" onClick={() => setCheckoutOpen(true)}>Check out</button>}
           </div>}
           {item && <div className="history-card"><p className="kicker">Record activity</p><strong>{item.checkoutHistory.length}</strong><span>checkout records</span></div>}
           {item && <MapPanel
             locations={locations}
             selectedLocationId={item.locationId}
             onSelectLocation={() => undefined}
           />}
        </aside>
      </div>
      {checkoutOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCheckoutOpen(false) }}><section className="bulk-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title"><div className="bulk-modal-header"><div><p className="kicker">Item checkout</p><h2 id="checkout-title">Who is taking it?</h2></div><button type="button" onClick={() => setCheckoutOpen(false)} aria-label="Close checkout">x</button></div><div className="bulk-modal-body checkout-fields"><label className="field"><span>Borrower</span><input autoFocus value={borrowerName} onChange={(event) => setBorrowerName(event.target.value)} maxLength={200} /></label><label className="field"><span>Notes <small>Optional</small></span><textarea value={checkoutNotes} onChange={(event) => setCheckoutNotes(event.target.value)} rows={3} maxLength={2000} /></label></div><div className="bulk-modal-actions"><button className="secondary-button" type="button" onClick={() => setCheckoutOpen(false)}>Cancel</button><button className="primary-button" type="button" disabled={!borrowerName.trim() || saving} onClick={() => void checkOut()}>{saving ? 'Checking out...' : 'Check out'}</button></div></section></div>}
    </main>
  )
}
