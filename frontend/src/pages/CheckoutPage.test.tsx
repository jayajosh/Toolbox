import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import type { Item, Location } from '../types'

const locations: Location[] = [{
  id: 'shed', name: 'Shed', description: null, parentLocationId: null, locationType: 'Building',
  isInternalComponent: false, color: '#728a77', childCount: 1, itemCount: 3, isSystem: false,
}, {
  id: 'shelf', name: 'Shelf', description: null, parentLocationId: 'shed', locationType: 'Shelf',
  isInternalComponent: true, color: '#728a77', childCount: 0, itemCount: 1, isSystem: false,
}]

const items: Item[] = ['Drill', 'Saw', 'Hammer'].map((name, index) => ({
  id: name.toLowerCase(), name, locationId: name === 'Saw' ? 'shelf' : 'shed', locationPath: name === 'Saw' ? 'Shed / Shelf' : 'Shed', locationColor: '#728a77',
  isCheckedOut: index === 2, activeCheckout: null, family: null, tags: [], isConsumable: false, consumableStatus: null,
}))

beforeEach(() => {
  window.history.pushState({}, '', '/checkout')
  // jsdom does not implement the native dialog methods.
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.open = true } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.open = false } })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
  vi.unstubAllGlobals()
  window.localStorage.clear()
  window.history.pushState({}, '', '/')
})

function mockApi(failingId?: string, enabled = true) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith('/features')) return Response.json({ checkout: enabled, checkoutHistory: true })
    if (url.startsWith('/api/locations')) return Response.json(locations)
    if (init?.method === 'POST') {
      const item = items.find((entry) => url.includes(`/${entry.id}/`))!
      if (item.id === failingId) return Response.json({ title: 'Item unavailable' }, { status: 409 })
      return Response.json({ ...item, isCheckedOut: url.endsWith('/checkout'), checkoutHistory: [] })
    }
    return Response.json(items)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('checkout page', () => {
  it('separates in and out items, omits status, and selects each side independently', async () => {
    mockApi()
    render(<App />)
    const available = within(await screen.findByRole('region', { name: 'Currently in' }))
    const out = within(screen.getByRole('region', { name: 'Checked out' }))
    expect(available.getByText('Drill')).toBeTruthy()
    expect(available.queryByText('Hammer')).toBeNull()
    expect(out.getByText('Hammer')).toBeTruthy()
    expect(screen.queryByText('Status')).toBeNull()
    fireEvent.click(available.getByLabelText('Select all available items'))
    expect((available.getByLabelText('Select Saw') as HTMLInputElement).checked).toBe(true)
    expect((out.getByLabelText('Select Hammer') as HTMLInputElement).checked).toBe(false)
    fireEvent.click(out.getByLabelText('Select all checked-out items'))
    fireEvent.click(available.getByLabelText('Select all available items'))
    expect((out.getByLabelText('Select Hammer') as HTMLInputElement).checked).toBe(true)
  })

  it('checks multiple items out with a borrower and checks them back in', async () => {
    const fetchMock = mockApi()
    render(<App />)
    fireEvent.click(await screen.findByLabelText('Select all available items'))
    fireEvent.click(screen.getByRole('button', { name: 'Check out selected' }))
    const modal = within(screen.getByRole('dialog', { name: 'Check out items' }))
    expect((modal.getByRole('button', { name: 'Check out items' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(modal.getByLabelText('Borrower'), { target: { value: 'Jay' } })
    fireEvent.click(modal.getByRole('button', { name: 'Check out items' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    const out = within(screen.getByRole('region', { name: 'Checked out' }))
    expect(out.getByText('Drill')).toBeTruthy()
    expect(out.getByText('Saw')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledWith('/api/items/saw/checkout', expect.objectContaining({ body: JSON.stringify({ borrowerName: 'Jay', notes: null }) }))
    fireEvent.click(out.getByLabelText('Select all checked-out items'))
    fireEvent.click(out.getByRole('button', { name: 'Check in selected' }))
    const checkinDialog = within(screen.getByRole('dialog', { name: 'Return selected items?' }))
    fireEvent.change(checkinDialog.getByRole('textbox'), { target: { value: 'Returned clean' } })
    fireEvent.click(checkinDialog.getByRole('button', { name: 'Check in items' }))
    await waitFor(() => expect(out.queryByText('Drill')).toBeNull())
    expect(within(screen.getByRole('region', { name: 'Currently in' })).getByText('Hammer')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledWith('/api/items/drill/checkin', expect.objectContaining({ body: JSON.stringify({ notes: 'Returned clean' }) }))
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(5)
  })

  it('moves successful items and keeps failed items selected for retry', async () => {
    mockApi('saw')
    render(<App />)
    fireEvent.click(await screen.findByLabelText('Select all available items'))
    fireEvent.click(screen.getByRole('button', { name: 'Check out selected' }))
    const modal = within(screen.getByRole('dialog'))
    fireEvent.change(modal.getByLabelText('Borrower'), { target: { value: 'Jay' } })
    fireEvent.click(modal.getByRole('button', { name: 'Check out items' }))
    expect(await modal.findByRole('alert')).toBeTruthy()
    fireEvent.click(modal.getByRole('button', { name: 'Cancel' }))
    expect(within(screen.getByRole('region', { name: 'Checked out' })).getByText('Drill')).toBeTruthy()
    expect((screen.getByLabelText('Select Saw') as HTMLInputElement).checked).toBe(true)
    expect((screen.getByLabelText('Select Drill') as HTMLInputElement).checked).toBe(false)
  })

  it('clears selections when searching so hidden items are not transferred', async () => {
    mockApi()
    render(<App />)
    fireEvent.click(await screen.findByLabelText('Select all available items'))
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Saw' } })
    await waitFor(() => expect(screen.queryByText('Drill')).toBeNull())
    expect((screen.getByLabelText('Select Saw') as HTMLInputElement).checked).toBe(false)
    expect((screen.getByRole('button', { name: 'Check out selected' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('filters both checkout panels by a container and its descendants', async () => {
    mockApi()
    render(<App />)
    await screen.findByText('Drill')

    fireEvent.change(screen.getByLabelText('Filter by container'), { target: { value: 'shelf' } })
    expect(screen.getByText('Saw')).toBeTruthy()
    expect(screen.queryByText('Drill')).toBeNull()
    expect(screen.queryByText('Hammer')).toBeNull()

    fireEvent.change(screen.getByLabelText('Filter by container'), { target: { value: 'shed' } })
    expect(screen.getByText('Drill')).toBeTruthy()
    expect(screen.getByText('Saw')).toBeTruthy()
    expect(screen.getByText('Hammer')).toBeTruthy()
  })

  it('does not offer actions when checkout is disabled', async () => {
    mockApi(undefined, false)
    render(<App />)
    expect(await screen.findByText('Check out is disabled for this toolbox.')).toBeTruthy()
    expect(screen.queryByRole('checkbox')).toBeNull()
  })
})
