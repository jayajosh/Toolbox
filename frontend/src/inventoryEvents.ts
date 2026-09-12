export const INVENTORY_CHANGED_EVENT = 'toolbox:inventory-changed'
const INVENTORY_CHANGED_STORAGE_KEY = 'toolbox-inventory-changed'

export function notifyInventoryChanged() {
  window.dispatchEvent(new Event(INVENTORY_CHANGED_EVENT))
  try {
    window.localStorage.setItem(INVENTORY_CHANGED_STORAGE_KEY, `${Date.now()}-${Math.random()}`)
  } catch {
    // Inventory refresh still works within the current tab when storage is unavailable.
  }
}

export function isInventoryChangedStorageKey(key: string | null) {
  return key === INVENTORY_CHANGED_STORAGE_KEY
}
