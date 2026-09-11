import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const locations = [{
  id: 'house', name: 'House', description: null, parentLocationId: null,
  locationType: 'Building', childCount: 1, itemCount: 0, isSystem: false, isInternalComponent: false, color: '#728a77',
}, {
  id: 'unorganised', name: 'Unorganised', description: null, parentLocationId: null,
  locationType: 'System', childCount: 0, itemCount: 0, isSystem: true, isInternalComponent: false, color: '#728a77',
}]
const items = [{
  id: 'wrench', name: 'Torque wrench',
  locationId: 'house', locationPath: 'House', locationColor: '#728a77', isCheckedOut: false, activeCheckout: null,
  family: null, tags: [], isConsumable: false, consumableStatus: null,
}]

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.localStorage.clear()
  window.history.pushState({}, '', '/')
})

describe('inventory navigation', () => {
  it('filters by tag and selects only visible items from the column header', async () => {
    const tag = { id: 'tools', name: 'Tools' }
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/features')) return Response.json({ checkout: true, checkoutHistory: true })
      if (url.startsWith('/api/items')) return Response.json([{ ...items[0], tags: [tag] }, { ...items[0], id: 'other', name: 'Other item' }])
      if (url.startsWith('/api/tags')) return Response.json([tag])
      if (url.startsWith('/api/locations')) return Response.json(locations)
      return Response.json([])
    }))
    const { container } = render(<App />)
    await screen.findByText('Other item')
    fireEvent.change(screen.getByLabelText('Filter by tag'), { target: { value: 'tools' } })
    expect(screen.queryByText('Other item')).toBeNull()
    const selectAll = screen.getByRole('checkbox', { name: 'Select all' })
    expect(container.querySelector('.item-column-head')?.contains(selectAll)).toBe(true)
    fireEvent.click(selectAll)
    expect((screen.getByLabelText('Select Torque wrench') as HTMLInputElement).checked).toBe(true)
    fireEvent.change(screen.getByLabelText('Filter by tag'), { target: { value: '' } })
    expect((screen.getByLabelText('Select Other item') as HTMLInputElement).checked).toBe(false)
  })

  it('filters inventory by a container and its descendants', async () => {
    const shelf = { ...locations[0], id: 'shelf', name: 'Shelf', parentLocationId: 'house', childCount: 0 }
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/features')) return Response.json({ checkout: true, checkoutHistory: true })
      if (url.startsWith('/api/items')) return Response.json([
        { ...items[0], locationId: shelf.id, locationPath: 'House / Shelf' },
        { ...items[0], id: 'loose', name: 'Loose item', locationId: 'unorganised', locationPath: 'Unorganised' },
      ])
      if (url.startsWith('/api/locations')) return Response.json([...locations, shelf])
      return Response.json([])
    }))
    render(<App />)
    await screen.findByText('Loose item')

    fireEvent.change(screen.getByLabelText('Filter by container'), { target: { value: 'house' } })

    expect(screen.getByText('Torque wrench')).toBeTruthy()
    expect(screen.queryByText('Loose item')).toBeNull()
  })

  it('loads the inventory list and storage context on the main page', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.startsWith('/api/items')
      ? Response.json(items)
      : Response.json(locations)))
    render(<App />)

    expect(screen.queryByRole('heading', { name: /Find the thing/ })).toBeNull()
    expect(await screen.findByText('Torque wrench')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Saved space designer plan' })).toBeTruthy()
    expect(screen.getByRole('searchbox', { name: 'Search inventory' })).toBeTruthy()
  })

  it('opens the item management page as a subpage', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.startsWith('/api/items')
      ? Response.json(items)
      : Response.json(locations)))
    render(<App />)
    await screen.findByText('Torque wrench')

    fireEvent.click(screen.getByRole('button', { name: /Add an item/ }))
    expect(window.location.pathname).toBe('/items/new')
    expect(screen.getByRole('heading', { name: /Give it a place/ })).toBeTruthy()
    expect(screen.getByLabelText('Name')).toBeTruthy()
    await waitFor(() => expect((screen.getByLabelText('Storage container') as HTMLSelectElement).value).toBe('unorganised'))
  })

  it('opens container creation from Storage while preserving the route', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(locations)))
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Storage' }))

    expect(window.location.pathname).toBe('/locations')
     expect(await screen.findByText('Inventory / Storage')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Add container/ })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Your storage' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Top-level container' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Locations' })).toBeNull()
  })

  it('supports searching without moving the main workspace', async () => {
    const fetchMock = vi.fn(async (url: string) => url.includes('search=socket')
      ? Response.json([])
      : url.startsWith('/api/items') ? Response.json(items) : Response.json(locations))
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    const search = screen.getByRole('searchbox', { name: 'Search inventory' })
    fireEvent.change(search, { target: { value: 'socket' } })
    await waitFor(() => expect(screen.getByText('Nothing matches that search.')).toBeTruthy())
    expect(screen.getByRole('heading', { name: 'Floor plan' })).toBeTruthy()
  })

  it('selects an item and moves it from the bulk action modal', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (init?.method === 'PUT') {
        const body = JSON.parse(String(init.body)) as { locationId: string }
        return Response.json({ ...items[0], locationId: body.locationId, locationPath: 'Unorganised', checkoutHistory: [] })
      }
      if (url.startsWith('/api/items')) return Response.json(items)
      if (url.startsWith('/api/locations')) return Response.json(locations)
      return Response.json([])
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    fireEvent.click(await screen.findByRole('checkbox', { name: 'Select Torque wrench' }))
    fireEvent.click(screen.getByRole('button', { name: 'Change container' }))
    const dialog = screen.getByRole('dialog', { name: 'Change container' })
    fireEvent.change(within(dialog).getByLabelText('New container'), { target: { value: 'unorganised' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Move items' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/items/wrench', expect.objectContaining({ method: 'PUT' })))
    expect(await screen.findByRole('button', { name: /Torque wrench.*Unorganised/ })).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('assigns a family and adds tags without replacing existing tags', async () => {
    const existingTag = { id: 'metric', name: 'Metric' }
    const addedTag = { id: 'impact', name: 'Impact' }
    const family = { id: 'sockets', name: 'Sockets', description: null, parentFamilyId: null, childCount: 0, itemCount: 0 }
    const taggedItem = { ...items[0], tags: [existingTag] }
    const updateBodies: Array<{ familyId: string | null; tagIds: string[] }> = []
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (init?.method === 'PUT') {
        const body = JSON.parse(String(init.body)) as { familyId: string | null; tagIds: string[] }
        updateBodies.push(body)
        return Response.json({
          ...taggedItem,
          family: body.familyId ? { id: family.id, name: family.name, parentFamilyId: null } : null,
          tags: [existingTag, addedTag].filter((tag) => body.tagIds.includes(tag.id)),
          checkoutHistory: [],
        })
      }
      if (url.startsWith('/api/items')) return Response.json([taggedItem])
      if (url.startsWith('/api/locations')) return Response.json(locations)
      if (url.startsWith('/api/families')) return Response.json([family])
      if (url.startsWith('/api/tags')) return Response.json([existingTag, addedTag])
      return Response.json([])
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    fireEvent.click(await screen.findByRole('checkbox', { name: 'Select Torque wrench' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add to family' }))
    let dialog = screen.getByRole('dialog', { name: 'Add to family' })
    fireEvent.change(within(dialog).getByLabelText('Family'), { target: { value: family.id } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add to family' }))
    await waitFor(() => expect(updateBodies).toHaveLength(1))
    expect(updateBodies[0]?.familyId).toBe(family.id)

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Torque wrench' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add tags' }))
    dialog = screen.getByRole('dialog', { name: 'Add tags' })
    fireEvent.click(within(dialog).getByRole('checkbox', { name: addedTag.name }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add tags' }))
    await waitFor(() => expect(updateBodies).toHaveLength(2))
    expect(updateBodies[1]?.tagIds).toEqual([existingTag.id, addedTag.id])
  })

  it('requires confirmation before deleting selected items', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (init?.method === 'DELETE') return new Response(null, { status: 204 })
      if (url.startsWith('/api/items')) return Response.json(items)
      if (url.startsWith('/api/locations')) return Response.json(locations)
      return Response.json([])
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    fireEvent.click(await screen.findByRole('checkbox', { name: 'Select Torque wrench' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(fetchMock).not.toHaveBeenCalledWith('/api/items/wrench', expect.objectContaining({ method: 'DELETE' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Delete items?' })).getByRole('button', { name: 'Delete items' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/items/wrench', expect.objectContaining({ method: 'DELETE' })))
    expect(await screen.findByText('Your inventory is ready for its first item.')).toBeTruthy()
  })

  it('opens the interactive space designer with the storage library', async () => {
    const internalLocation = {
      id: 'drawer', name: 'Top drawer', description: null, parentLocationId: 'house',
      locationType: 'Drawer', childCount: 0, itemCount: 0, isSystem: false, isInternalComponent: true,
    }
    vi.stubGlobal('fetch', vi.fn(async () => Response.json([...locations, internalLocation])))
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Space designer' }))

    expect(window.location.pathname).toBe('/designer')
     expect(screen.getByText('Spaces / Floor plan')).toBeTruthy()
    expect(screen.getByLabelText('Floor plan drawing canvas')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Wall/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Door/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Garage door/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Window/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Storage library/ }))
    expect(await screen.findByRole('heading', { name: 'Your containers' })).toBeTruthy()
    expect(screen.getByRole('complementary', { name: 'Storage library' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /House/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Top drawer/ })).toBeNull()
  })

  it('resizes the shared tools/library sidebar with keyboard and captured pointers', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(locations)))
    window.history.pushState({}, '', '/designer')
    render(<App />)
    const handle = screen.getByRole('separator', { name: 'Sidebar width' })
    const shell = screen.getByRole('region', { name: 'Space designer' })
    const capture = vi.fn()
    const release = vi.fn()
    Object.assign(handle, { setPointerCapture: capture, hasPointerCapture: () => true, releasePointerCapture: release })

    expect(handle.getAttribute('aria-controls')).toBe(screen.getByRole('complementary', { name: 'Drawing tools' }).id)
    fireEvent.keyDown(handle, { key: 'ArrowRight' })
    expect(handle.getAttribute('aria-valuenow')).toBe('290')
    fireEvent.keyDown(handle, { key: 'Home' })
    fireEvent.keyDown(handle, { key: 'ArrowLeft' })
    expect(handle.getAttribute('aria-valuenow')).toBe('220')
    fireEvent.keyDown(handle, { key: 'End' })
    fireEvent.keyDown(handle, { key: 'ArrowRight' })
    expect(handle.getAttribute('aria-valuenow')).toBe('440')

    fireEvent.click(screen.getByRole('button', { name: /Storage library/ }))
    await screen.findByRole('button', { name: /House/ })
    expect(screen.getByRole('separator')).toBe(handle)
    expect(handle.getAttribute('aria-valuenow')).toBe('440')
    fireEvent.pointerDown(handle, { button: 0, pointerId: 7, clientX: 440 })
    expect(capture).toHaveBeenCalledWith(7)
    fireEvent.pointerMove(handle, { pointerId: 8, clientX: 100 })
    expect(handle.getAttribute('aria-valuenow')).toBe('440')
    fireEvent.pointerMove(handle, { pointerId: 7, clientX: 320 })
    expect(shell.style.getPropertyValue('--sidebar-width')).toBe('320px')
    fireEvent.pointerUp(handle, { pointerId: 7 })
    expect(release).toHaveBeenCalledWith(7)
    fireEvent.pointerMove(handle, { pointerId: 7, clientX: 400 })
    expect(handle.getAttribute('aria-valuenow')).toBe('320')
    fireEvent.pointerDown(handle, { button: 0, pointerId: 9, clientX: 320 })
    fireEvent.pointerMove(handle, { pointerId: 9, clientX: -500 })
    expect(handle.getAttribute('aria-valuenow')).toBe('220')
    fireEvent.pointerCancel(handle, { pointerId: 9 })
    fireEvent.pointerMove(handle, { pointerId: 9, clientX: 500 })
    expect(handle.getAttribute('aria-valuenow')).toBe('220')
    fireEvent.click(screen.getByRole('button', { name: /Back to tools/ }))
    expect(handle.getAttribute('aria-valuenow')).toBe('220')
  })

  it('draws a wall with pointer controls', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(locations)))
    window.history.pushState({}, '', '/designer')
    const { container } = render(<App />)
    const canvas = screen.getByLabelText('Floor plan drawing canvas')
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 960, bottom: 608, width: 960, height: 608, toJSON: () => ({}) })

    fireEvent.click(screen.getByRole('button', { name: /Wall/ }))
    fireEvent.pointerDown(canvas, { button: 0, pointerId: 1, clientX: 100, clientY: 100 })
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 240, clientY: 100 })
    fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 240, clientY: 100 })

    expect(container.querySelectorAll('.plan-line--wall')).toHaveLength(6)
  })

  it('places a storage container from the library onto the grid', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(locations)))
    window.history.pushState({}, '', '/designer')
    const { container } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Storage library/ }))
    const location = await screen.findByRole('button', { name: /House/ })
    const canvas = screen.getByLabelText('Floor plan drawing canvas')
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 960, bottom: 608, width: 960, height: 608, toJSON: () => ({}) })
    const values = new Map<string, string>()
    const dataTransfer = {
      effectAllowed: 'all',
      setData: (type: string, value: string) => values.set(type, value),
      getData: (type: string) => values.get(type) ?? '',
    }

    fireEvent.dragStart(location, { dataTransfer })
    const dropEvent = new Event('drop', { bubbles: true, cancelable: true })
    Object.defineProperties(dropEvent, {
      dataTransfer: { value: dataTransfer },
      clientX: { value: 300 },
      clientY: { value: 220 },
    })
    fireEvent(canvas.parentElement!, dropEvent)

    expect(container.querySelectorAll('.plan-area')).toHaveLength(3)
    expect(container.querySelector('.plan-area.is-selected .plan-area-shape')?.getAttribute('x')).not.toBe('NaN')
    expect(screen.getByText('Mapped')).toBeTruthy()
  })

  it('lets the designer measurement unit and grid scale be defined', () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(locations)))
    window.history.pushState({}, '', '/designer')
    render(<App />)

    fireEvent.change(screen.getByLabelText('Measurement unit'), { target: { value: 'm' } })
    fireEvent.change(screen.getByLabelText('Scale per grid square'), { target: { value: '0.5' } })
    fireEvent.change(screen.getByLabelText('Maximum design width'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('Maximum design height'), { target: { value: '5' } })

    expect(screen.queryByLabelText('Grid size')).toBeNull()
    expect(screen.getByText('1 grid square = 0.5 m')).toBeTruthy()
    expect(screen.getByLabelText('Floor plan drawing canvas').getAttribute('viewBox')).toBe('0 0 400 200')
    expect(JSON.parse(window.localStorage.getItem('toolbox-space-plan-settings-v1') ?? '{}')).toEqual({ unit: 'm', perGrid: 0.5, gridSize: 20, maxWidth: 10, maxHeight: 5 })
  })
})
