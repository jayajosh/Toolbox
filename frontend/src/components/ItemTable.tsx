import type { CSSProperties } from 'react'
import type { Item } from '../types'

type ItemTableProps = {
  items: Item[]
  selectedItemIds: Set<string>
  onToggleItem: (id: string) => void
  onToggleAll: () => void
  onNavigate: (path: string) => void
  showStatus?: boolean
  disabled?: boolean
  selectAllLabel?: string
  onItemClick?: (item: Item) => void
  locationHeader?: string
  getLocationText?: (item: Item) => string
}

export function ItemTable({ items, selectedItemIds, onToggleItem, onToggleAll, onNavigate, showStatus = true, disabled = false, selectAllLabel = 'Select all', onItemClick, locationHeader = 'Container', getLocationText = (item) => item.locationPath }: ItemTableProps) {
  const allSelected = items.length > 0 && items.every((item) => selectedItemIds.has(item.id))

  return (
    <div className={`item-list${showStatus ? '' : ' item-list--circulation'}`}>
      <div className="item-column-head">
        <input className="item-select" type="checkbox" aria-label={selectAllLabel} title={selectAllLabel} checked={allSelected} onChange={onToggleAll} disabled={disabled} />
        <span>Item</span><span>{locationHeader}</span>{showStatus && <span>Status</span>}<span />
      </div>
      {items.map((item) => (
        <div className={`item-row${selectedItemIds.has(item.id) ? ' is-selected' : ''}`} key={item.id}>
          <input className="item-select" type="checkbox" checked={selectedItemIds.has(item.id)} onChange={() => onToggleItem(item.id)} aria-label={`Select ${item.name}`} disabled={disabled} />
          <button className="item-row-main" type="button" onClick={() => onItemClick ? onItemClick(item) : onNavigate(`/items/${item.id}`)} disabled={disabled}>
            <span className="item-info">
              <strong>{item.name}</strong>
              {item.family?.name && <span>{item.family.name}</span>}
              {item.tags.length > 0 && <span className="item-tags">{item.tags.map((tag) => <span className="item-tag-chip" key={tag.id}>{tag.name}</span>)}</span>}
            </span>
            <span className="item-location" style={{ '--location-color': item.locationColor } as CSSProperties}><span className="pin" aria-hidden="true" />{getLocationText(item)}</span>
            {showStatus && <span className={`item-status ${item.isCheckedOut ? 'item-status--out' : ''}`}>
              {item.isCheckedOut ? 'Out' : 'Here'}
              {item.isConsumable && <small>{item.consumableStatus === 'low' ? 'Low stock' : item.consumableStatus === 'out' ? 'Out of stock' : 'Stock not set'}</small>}
            </span>}
            <span className="row-arrow" aria-hidden="true">&gt;</span>
          </button>
        </div>
      ))}
    </div>
  )
}
