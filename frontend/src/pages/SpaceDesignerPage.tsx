import { useEffect, useRef, useState, type DragEvent as ReactDragEvent, type FormEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { createLocation, listLocations } from '../api'
import type { Location } from '../types'

type Point = { x: number; y: number }
type Tool = 'select' | 'wall' | 'area' | 'door' | 'garageDoor' | 'window'
type PlanElement =
  | { id: string; type: 'wall'; start: Point; end: Point }
  | { id: string; type: 'area'; x: number; y: number; width: number; height: number; label: string; locationId?: string }
  | { id: string; type: 'door' | 'garageDoor' | 'window'; start: Point; end: Point }

type Interaction = {
  mode: 'draw' | 'move' | 'resize'
  id: string
  start: Point
  original: PlanElement
  before: PlanElement[]
  handle?: string
}

type SpaceDesignerPageProps = { onNavigate: (path: string) => void }
type MeasurementUnit = 'ft' | 'in' | 'm' | 'cm' | 'mm'
type MeasurementSettings = { unit: MeasurementUnit; perGrid: number; gridSize: number; maxWidth: number; maxHeight: number }

const DEFAULT_GRID_SIZE = 20
const DEFAULT_MAX_WIDTH = 60
const DEFAULT_MAX_HEIGHT = 38
const STORAGE_KEY = 'toolbox-space-plan-v1'
const SETTINGS_STORAGE_KEY = 'toolbox-space-plan-settings-v1'
let localIdSequence = 0

function createPlanId(prefix: string) {
  localIdSequence += 1
  return `${prefix}-${Date.now().toString(36)}-${localIdSequence.toString(36)}`
}

const starterPlan: PlanElement[] = [
  { id: 'wall-1', type: 'wall', start: { x: 160, y: 140 }, end: { x: 860, y: 140 } },
  { id: 'wall-2', type: 'wall', start: { x: 860, y: 140 }, end: { x: 860, y: 600 } },
  { id: 'wall-3', type: 'wall', start: { x: 860, y: 600 }, end: { x: 160, y: 600 } },
  { id: 'wall-4', type: 'wall', start: { x: 160, y: 600 }, end: { x: 160, y: 140 } },
  { id: 'wall-5', type: 'wall', start: { x: 560, y: 140 }, end: { x: 560, y: 600 } },
  { id: 'area-1', type: 'area', x: 240, y: 220, width: 220, height: 120, label: 'Workbench' },
  { id: 'area-2', type: 'area', x: 650, y: 230, width: 120, height: 220, label: 'Storage' },
  { id: 'door-1', type: 'door', start: { x: 560, y: 500 }, end: { x: 500, y: 500 } },
  { id: 'window-1', type: 'window', start: { x: 320, y: 140 }, end: { x: 440, y: 140 } },
]

function Icon({ children }: { children: ReactNode }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{children}</svg>
}

const toolDetails: { tool: Tool; label: string; shortcut: string; icon: ReactNode }[] = [
  { tool: 'select', label: 'Select', shortcut: 'V', icon: <Icon><path d="M6 3l11 8-5 1.5L9 18z" /></Icon> },
  { tool: 'wall', label: 'Wall', shortcut: 'W', icon: <Icon><path d="M4 17L18 5l2 2L6 19z" /></Icon> },
  { tool: 'area', label: 'Rectangle', shortcut: 'R', icon: <Icon><rect x="4" y="5" width="16" height="14" rx="1" /></Icon> },
  { tool: 'door', label: 'Door', shortcut: 'D', icon: <Icon><path d="M5 20V4h11v16M6 19h12M16 5l-7 2v12" /></Icon> },
  { tool: 'garageDoor', label: 'Garage door', shortcut: 'G', icon: <Icon><path d="M3 20V8l3-4h12l3 4v12M6 20V8h12v12M6 12h12M6 16h12" /></Icon> },
  { tool: 'window', label: 'Window', shortcut: 'N', icon: <Icon><path d="M4 8h16M4 16h16M7 5v14M17 5v14" /></Icon> },
]

function cloneElements(elements: PlanElement[]) {
  return structuredClone(elements) as PlanElement[]
}

function loadPlan() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) as PlanElement[] : starterPlan
  } catch {
    return starterPlan
  }
}

function loadMeasurementSettings(): MeasurementSettings {
  try {
    const saved = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!saved) return { unit: 'ft', perGrid: 1, gridSize: DEFAULT_GRID_SIZE, maxWidth: DEFAULT_MAX_WIDTH, maxHeight: DEFAULT_MAX_HEIGHT }
    const settings = JSON.parse(saved) as Partial<MeasurementSettings>
    if (!['ft', 'in', 'm', 'cm', 'mm'].includes(settings.unit ?? '') || !Number.isFinite(settings.perGrid) || settings.perGrid! <= 0 || !Number.isFinite(settings.gridSize) || settings.gridSize! < 5 || !Number.isFinite(settings.maxWidth) || settings.maxWidth! <= 0 || !Number.isFinite(settings.maxHeight) || settings.maxHeight! <= 0) {
      return { unit: 'ft', perGrid: 1, gridSize: DEFAULT_GRID_SIZE, maxWidth: DEFAULT_MAX_WIDTH, maxHeight: DEFAULT_MAX_HEIGHT }
    }
    return { unit: settings.unit as MeasurementUnit, perGrid: settings.perGrid!, gridSize: settings.gridSize!, maxWidth: settings.maxWidth!, maxHeight: settings.maxHeight! }
  } catch {
    return { unit: 'ft', perGrid: 1, gridSize: DEFAULT_GRID_SIZE, maxWidth: DEFAULT_MAX_WIDTH, maxHeight: DEFAULT_MAX_HEIGHT }
  }
}

function formatMeasurement(planLength: number, settings: MeasurementSettings) {
  const length = planLength / settings.gridSize * settings.perGrid
  const digits = settings.unit === 'm' && length < 10 ? 2 : length % 1 ? 1 : 0
  return `${length.toFixed(digits)} ${settings.unit}`
}

function lineLength(element: Extract<PlanElement, { start: Point }>) {
  return Math.hypot(element.end.x - element.start.x, element.end.y - element.start.y)
}

function normalizeArea(start: Point, end: Point) {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  }
}

function locationPath(location: Location, locations: Location[]) {
  const byId = new Map(locations.map((item) => [item.id, item]))
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

export function SpaceDesignerPage({ onNavigate }: SpaceDesignerPageProps) {
  const [elements, setElements] = useState<PlanElement[]>(loadPlan)
  const [tool, setTool] = useState<Tool>('select')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(0.8)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [measurementSettings, setMeasurementSettings] = useState<MeasurementSettings>(loadMeasurementSettings)
  const [undoStack, setUndoStack] = useState<PlanElement[][]>([])
  const [redoStack, setRedoStack] = useState<PlanElement[][]>([])
  const [interaction, setInteraction] = useState<Interaction | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [locationError, setLocationError] = useState<string | null>(null)
  const [pendingArea, setPendingArea] = useState<{ id: string; before: PlanElement[] } | null>(null)
  const [newLocationName, setNewLocationName] = useState('')
  const [newLocationParentId, setNewLocationParentId] = useState<string | null>(null)
  const [creatingLocation, setCreatingLocation] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)

  const selected = elements.find((element) => element.id === selectedId) ?? null
  const canvasWidth = Math.max(measurementSettings.gridSize, Math.round(measurementSettings.maxWidth / measurementSettings.perGrid) * measurementSettings.gridSize)
  const canvasHeight = Math.max(measurementSettings.gridSize, Math.round(measurementSettings.maxHeight / measurementSettings.perGrid) * measurementSettings.gridSize)
  const snap = (value: number) => snapEnabled ? Math.round(value / measurementSettings.gridSize) * measurementSettings.gridSize : Math.round(value)
  const clampPoint = (point: Point) => ({ x: Math.min(canvasWidth, Math.max(0, point.x)), y: Math.min(canvasHeight, Math.max(0, point.y)) })

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(elements))
  }, [elements])

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(measurementSettings))
  }, [measurementSettings])

  useEffect(() => {
    const controller = new AbortController()
    listLocations(controller.signal)
      .then((items) => {
        setLocations(items.filter((location) => !location.isSystem && !location.isInternalComponent))
        setLocationError(null)
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setLocationError(reason instanceof Error ? reason.message : 'Could not load locations.')
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement) return
      const key = event.key.toLowerCase()
      if ((event.metaKey || event.ctrlKey) && key === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
        event.preventDefault()
        removeSelected()
        return
      }
      const nextTool = toolDetails.find((item) => item.shortcut.toLowerCase() === key)?.tool
      if (nextTool) setTool(nextTool)
      if (event.key === 'Escape') {
        setTool('select')
        setSelectedId(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  function pointFromEvent(event: ReactPointerEvent<SVGElement>) {
    const rect = svgRef.current!.getBoundingClientRect()
    return clampPoint({ x: snap((event.clientX - rect.left) / zoom), y: snap((event.clientY - rect.top) / zoom) })
  }

  function saveChange(next: PlanElement[]) {
    setUndoStack((stack) => [...stack.slice(-39), cloneElements(elements)])
    setRedoStack([])
    setElements(next)
  }

  function undo() {
    setUndoStack((stack) => {
      const previous = stack.at(-1)
      if (!previous) return stack
      setRedoStack((redoItems) => [...redoItems, cloneElements(elements)])
      setElements(previous)
      setSelectedId(null)
      return stack.slice(0, -1)
    })
  }

  function redo() {
    setRedoStack((stack) => {
      const next = stack.at(-1)
      if (!next) return stack
      setUndoStack((undoItems) => [...undoItems, cloneElements(elements)])
      setElements(next)
      setSelectedId(null)
      return stack.slice(0, -1)
    })
  }

  function startDrawing(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return
    if (tool === 'select') {
      setSelectedId(null)
      return
    }
    const point = pointFromEvent(event)
    const id = createPlanId(tool)
    const next: PlanElement = tool === 'area'
      ? { id, type: 'area', x: point.x, y: point.y, width: 0, height: 0, label: `Area ${elements.filter((item) => item.type === 'area').length + 1}` }
      : { id, type: tool, start: point, end: point }
    svgRef.current?.setPointerCapture?.(event.pointerId)
    setSelectedId(id)
    setElements((current) => [...current, next])
    setInteraction({ mode: 'draw', id, start: point, original: next, before: cloneElements(elements) })
  }

  function startEditing(event: ReactPointerEvent<SVGElement>, element: PlanElement, mode: 'move' | 'resize' = 'move', handle?: string) {
    if (tool !== 'select' || event.button !== 0) return
    event.stopPropagation()
    const point = pointFromEvent(event)
    svgRef.current?.setPointerCapture?.(event.pointerId)
    setSelectedId(element.id)
    setInteraction({ mode, id: element.id, start: point, original: cloneElements([element])[0]!, before: cloneElements(elements), handle })
  }

  function movePointer(event: ReactPointerEvent<SVGSVGElement>) {
    if (!interaction) return
    const point = pointFromEvent(event)
    const delta = { x: point.x - interaction.start.x, y: point.y - interaction.start.y }
    setElements((current) => current.map((element) => {
      if (element.id !== interaction.id) return element
      const original = interaction.original
      if (interaction.mode === 'draw') {
        if (original.type === 'area') return { ...original, ...normalizeArea(interaction.start, point) }
        return { ...original, end: point }
      }
      if (interaction.mode === 'move') {
        if (original.type === 'area') return { ...original, x: original.x + delta.x, y: original.y + delta.y }
        return {
          ...original,
          start: { x: original.start.x + delta.x, y: original.start.y + delta.y },
          end: { x: original.end.x + delta.x, y: original.end.y + delta.y },
        }
      }
      if (original.type === 'area') {
        const opposite = interaction.handle === 'nw'
          ? { x: original.x + original.width, y: original.y + original.height }
          : interaction.handle === 'ne'
            ? { x: original.x, y: original.y + original.height }
            : interaction.handle === 'sw'
              ? { x: original.x + original.width, y: original.y }
              : { x: original.x, y: original.y }
        return { ...original, ...normalizeArea(opposite, point) }
      }
      return { ...original, [interaction.handle === 'start' ? 'start' : 'end']: point }
    }))
  }

  function endPointer(event: ReactPointerEvent<SVGSVGElement>) {
    if (!interaction) return
    svgRef.current?.releasePointerCapture?.(event.pointerId)
    let valid = true
    const current = elements.find((element) => element.id === interaction.id)
    if (interaction.mode === 'draw' && current) {
      valid = current.type === 'area'
        ? current.width >= measurementSettings.gridSize && current.height >= measurementSettings.gridSize
        : lineLength(current) >= measurementSettings.gridSize
    }
    if (!valid) {
      setElements(interaction.before)
      setSelectedId(null)
    } else if (interaction.mode === 'draw' && current?.type === 'area') {
      setNewLocationName('')
      setNewLocationParentId(null)
      setLocationError(null)
      setPendingArea({ id: current.id, before: interaction.before })
    } else {
      setUndoStack((stack) => [...stack.slice(-39), interaction.before])
      setRedoStack([])
    }
    setInteraction(null)
  }

  function placeLocation(location: Location, point?: Point) {
    const mapped = elements.find((element) => element.type === 'area' && element.locationId === location.id)
    if (mapped) {
      setSelectedId(mapped.id)
      setTool('select')
      return
    }
    const offset = elements.filter((element) => element.type === 'area').length * measurementSettings.gridSize
    const center = point ?? { x: 360 + offset, y: 260 + offset }
    const area: PlanElement = {
      id: createPlanId('area'),
      type: 'area',
      x: Math.max(0, snap(center.x - 80)),
      y: Math.max(0, snap(center.y - 50)),
      width: 160,
      height: 100,
      label: location.name,
      locationId: location.id,
    }
    saveChange([...elements, area])
    setSelectedId(area.id)
    setTool('select')
  }

  function dropLocation(event: ReactDragEvent<HTMLDivElement>) {
    event.preventDefault()
    const id = event.dataTransfer.getData('application/x-toolbox-location')
    const location = locations.find((item) => item.id === id)
    const rect = svgRef.current?.getBoundingClientRect()
    if (!location || !rect) return
    placeLocation(location, { x: snap((event.clientX - rect.left) / zoom), y: snap((event.clientY - rect.top) / zoom) })
  }

  async function confirmNewLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!pendingArea || !newLocationName.trim()) return
    setCreatingLocation(true)
    setLocationError(null)
    try {
      const created = await createLocation({
        name: newLocationName.trim(),
        description: '',
        parentLocationId: newLocationParentId,
        locationType: 'Room',
         isInternalComponent: false,
         color: '#728a77',
      })
      setElements((currentElements) => currentElements.map((element) => element.id === pendingArea.id && element.type === 'area'
        ? { ...element, label: newLocationName.trim(), locationId: created.id }
        : element))
      setUndoStack((stack) => [...stack.slice(-39), pendingArea.before])
      setRedoStack([])
      setLocations((currentLocations) => [...currentLocations, {
        id: created.id,
        name: newLocationName.trim(),
        description: null,
        parentLocationId: newLocationParentId,
        locationType: 'Room',
         isInternalComponent: false,
         color: '#728a77',
        childCount: 0,
        itemCount: 0,
        isSystem: false,
      }])
      setPendingArea(null)
      setTool('select')
    } catch (reason: unknown) {
      setLocationError(reason instanceof Error ? reason.message : 'Could not create this location.')
    } finally {
      setCreatingLocation(false)
    }
  }

  function cancelNewLocation() {
    if (!pendingArea) return
    setElements(pendingArea.before)
    setPendingArea(null)
    setSelectedId(null)
  }

  function removeSelected() {
    if (!selectedId) return
    saveChange(elements.filter((element) => element.id !== selectedId))
    setSelectedId(null)
  }

  function updateSelected(patch: Partial<PlanElement>) {
    if (!selectedId) return
    saveChange(elements.map((element) => element.id === selectedId ? { ...element, ...patch } as PlanElement : element))
  }

  function clearPlan() {
    if (!window.confirm('Start a new blank plan? Your current plan can still be restored with Undo.')) return
    saveChange([])
    setSelectedId(null)
  }

  function exportPlan() {
    const blob = new Blob([JSON.stringify({ version: 1, canvas: { width: canvasWidth, height: canvasHeight }, gridSize: measurementSettings.gridSize, measurementSettings, elements }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'toolbox-space-plan.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  function renderElement(element: PlanElement) {
    const isSelected = element.id === selectedId
    if (element.type === 'area') {
      return (
        <g key={element.id} className={`plan-area${isSelected ? ' is-selected' : ''}`} onPointerDown={(event) => startEditing(event, element)}>
          <rect className="plan-area-shape" x={element.x} y={element.y} width={element.width} height={element.height} />
          {element.width > 50 && element.height > 35 && <>
            <text x={element.x + element.width / 2} y={element.y + element.height / 2 - 5}>{element.label}</text>
            <text className="plan-measure" x={element.x + element.width / 2} y={element.y + element.height / 2 + 15}>{formatMeasurement(element.width, measurementSettings)} x {formatMeasurement(element.height, measurementSettings)}</text>
          </>}
          {isSelected && ['nw', 'ne', 'sw', 'se'].map((handle) => {
            const x = handle.includes('w') ? element.x : element.x + element.width
            const y = handle.includes('n') ? element.y : element.y + element.height
            return <rect key={handle} className="plan-handle" x={x - 6} y={y - 6} width="12" height="12" onPointerDown={(event) => startEditing(event, element, 'resize', handle)} />
          })}
        </g>
      )
    }

    const dx = element.end.x - element.start.x
    const dy = element.end.y - element.start.y
    const length = Math.max(1, Math.hypot(dx, dy))
    const nx = -dy / length
    const ny = dx / length
    return (
      <g key={element.id} className={`plan-line plan-line--${element.type}${isSelected ? ' is-selected' : ''}`} onPointerDown={(event) => startEditing(event, element)}>
        <line className="plan-hit-line" x1={element.start.x} y1={element.start.y} x2={element.end.x} y2={element.end.y} />
        {element.type === 'wall' && <line className="plan-wall-stroke" x1={element.start.x} y1={element.start.y} x2={element.end.x} y2={element.end.y} />}
        {element.type === 'window' && <>
          <line className="plan-opening-cut" x1={element.start.x} y1={element.start.y} x2={element.end.x} y2={element.end.y} />
          <line className="plan-window-stroke" x1={element.start.x + nx * 4} y1={element.start.y + ny * 4} x2={element.end.x + nx * 4} y2={element.end.y + ny * 4} />
          <line className="plan-window-stroke" x1={element.start.x - nx * 4} y1={element.start.y - ny * 4} x2={element.end.x - nx * 4} y2={element.end.y - ny * 4} />
        </>}
        {element.type === 'door' && <>
          <line className="plan-opening-cut" x1={element.start.x} y1={element.start.y} x2={element.end.x} y2={element.end.y} />
          <line className="plan-door-leaf" x1={element.start.x} y1={element.start.y} x2={element.end.x} y2={element.end.y} />
          <path className="plan-door-swing" d={`M ${element.end.x} ${element.end.y} A ${length} ${length} 0 0 1 ${element.start.x + nx * length} ${element.start.y + ny * length}`} />
        </>}
        {element.type === 'garageDoor' && <>
          <line className="plan-opening-cut plan-opening-cut--garage" x1={element.start.x} y1={element.start.y} x2={element.end.x} y2={element.end.y} />
          <line className="plan-garage-edge" x1={element.start.x + nx * 6} y1={element.start.y + ny * 6} x2={element.end.x + nx * 6} y2={element.end.y + ny * 6} />
          <line className="plan-garage-edge" x1={element.start.x - nx * 6} y1={element.start.y - ny * 6} x2={element.end.x - nx * 6} y2={element.end.y - ny * 6} />
          {[.2, .4, .6, .8].map((position) => <line key={position} className="plan-garage-panel" x1={element.start.x + dx * position + nx * 6} y1={element.start.y + dy * position + ny * 6} x2={element.start.x + dx * position - nx * 6} y2={element.start.y + dy * position - ny * 6} />)}
        </>}
        {isSelected && <>
          <circle className="plan-handle" cx={element.start.x} cy={element.start.y} r="7" onPointerDown={(event) => startEditing(event, element, 'resize', 'start')} />
          <circle className="plan-handle" cx={element.end.x} cy={element.end.y} r="7" onPointerDown={(event) => startEditing(event, element, 'resize', 'end')} />
        </>}
      </g>
    )
  }

  return (
    <main className="designer-page">
      <header className="designer-heading">
        <div>
          <button className="back-link" type="button" onClick={() => onNavigate('/')}><span aria-hidden="true">&larr;</span> Back to inventory</button>
          <p className="kicker">Spaces / Floor plan</p>
          <h1>Shape your <em>space.</em></h1>
        </div>
        <div className="designer-heading-actions">
          <span className="save-status"><span /> Saved locally</span>
          <button className="secondary-button" type="button" onClick={clearPlan}>New plan</button>
          <button className="primary-button" type="button" onClick={exportPlan}>Export plan <span aria-hidden="true">&darr;</span></button>
        </div>
      </header>

      <section className="designer-shell" aria-label="Space designer">
        <aside className="designer-tools" aria-label="Drawing tools">
          <span className="tool-section-label">Tools</span>
          {toolDetails.map((item) => <button key={item.tool} className={tool === item.tool ? 'designer-tool is-active' : 'designer-tool'} type="button" onClick={() => setTool(item.tool)} title={`${item.label} (${item.shortcut})`}>{item.icon}<span>{item.label}</span><kbd>{item.shortcut}</kbd></button>)}
          <div className="tool-divider" />
          <button className="designer-tool designer-tool--compact" type="button" onClick={undo} disabled={!undoStack.length} title="Undo"><Icon><path d="M9 7H5v-4M5 7c2-3 5-4 8-3 4 1 7 5 6 9s-5 7-9 6c-2 0-4-2-5-4" /></Icon><span>Undo</span></button>
          <button className="designer-tool designer-tool--compact" type="button" onClick={redo} disabled={!redoStack.length} title="Redo"><Icon><path d="M15 7h4v-4M19 7c-2-3-5-4-8-3-4 1-7 5-6 9s5 7 9 6c2 0 4-2 5-4" /></Icon><span>Redo</span></button>
        </aside>

        <div className="designer-workspace">
          <div className="canvas-toolbar">
            <div><strong>{toolDetails.find((item) => item.tool === tool)?.label}</strong><span>{tool === 'select' ? 'Click an object to edit it' : 'Click and drag on the grid to draw'}</span></div>
            <div className="canvas-controls">
              <button className={snapEnabled ? 'snap-toggle is-active' : 'snap-toggle'} type="button" onClick={() => setSnapEnabled((enabled) => !enabled)}><span className="snap-icon" /> Snap {snapEnabled ? 'on' : 'off'}</button>
              <span className="control-divider" />
              <label className="measurement-select"><span>Units</span><select aria-label="Measurement unit" value={measurementSettings.unit} onChange={(event) => setMeasurementSettings((settings) => ({ ...settings, unit: event.target.value as MeasurementUnit }))}><option value="ft">Feet</option><option value="in">Inches</option><option value="m">Metres</option><option value="cm">Centimetres</option><option value="mm">Millimetres</option></select></label>
              <label className="toolbar-scale"><span>Per square</span><input aria-label="Scale per grid square" type="number" min="0.01" step="0.1" value={measurementSettings.perGrid} onChange={(event) => setMeasurementSettings((settings) => ({ ...settings, perGrid: Math.max(.01, Number(event.target.value)) }))} /></label>
              <label className="toolbar-grid-size"><span>Grid</span><input aria-label="Grid size" type="number" min="5" max="100" step="5" value={measurementSettings.gridSize} onChange={(event) => setMeasurementSettings((settings) => ({ ...settings, gridSize: Math.min(100, Math.max(5, Number(event.target.value))) }))} /><small>canvas units</small></label>
              <label className="toolbar-design-size"><span>Max</span><input aria-label="Maximum design width" type="number" min="1" step="0.5" value={measurementSettings.maxWidth} onChange={(event) => setMeasurementSettings((settings) => ({ ...settings, maxWidth: Math.max(1, Number(event.target.value)) }))} /><span>&times;</span><input aria-label="Maximum design height" type="number" min="1" step="0.5" value={measurementSettings.maxHeight} onChange={(event) => setMeasurementSettings((settings) => ({ ...settings, maxHeight: Math.max(1, Number(event.target.value)) }))} /><small>{measurementSettings.unit}</small></label>
              <button type="button" onClick={() => setZoom((value) => Math.max(.5, value - .1))} aria-label="Zoom out">&minus;</button>
              <span className="zoom-value">{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => setZoom((value) => Math.min(1.5, value + .1))} aria-label="Zoom in">+</button>
            </div>
          </div>
          <div className={`plan-viewport tool-${tool}`} onDragOver={(event) => event.preventDefault()} onDrop={dropLocation}>
            <svg
              ref={svgRef}
              className="plan-canvas"
              width={canvasWidth * zoom}
              height={canvasHeight * zoom}
              viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
              onPointerDown={startDrawing}
              onPointerMove={movePointer}
              onPointerUp={endPointer}
              onPointerCancel={endPointer}
              aria-label="Floor plan drawing canvas"
            >
              <defs>
                <pattern id="small-grid" width={measurementSettings.gridSize} height={measurementSettings.gridSize} patternUnits="userSpaceOnUse"><path d={`M ${measurementSettings.gridSize} 0 L 0 0 0 ${measurementSettings.gridSize}`} /></pattern>
                <pattern id="large-grid" width={measurementSettings.gridSize * 5} height={measurementSettings.gridSize * 5} patternUnits="userSpaceOnUse"><rect width={measurementSettings.gridSize * 5} height={measurementSettings.gridSize * 5} fill="url(#small-grid)" /><path d={`M ${measurementSettings.gridSize * 5} 0 L 0 0 0 ${measurementSettings.gridSize * 5}`} /></pattern>
              </defs>
              <rect className="plan-grid-background" width={canvasWidth} height={canvasHeight} fill="url(#large-grid)" />
              {elements.map(renderElement)}
            </svg>
          </div>
          <div className="canvas-statusbar"><span><b>{elements.filter((item) => item.type === 'wall').length}</b> walls</span><span><b>{elements.filter((item) => item.type === 'area').length}</b> objects</span><span><b>{elements.filter((item) => item.type === 'door' || item.type === 'garageDoor' || item.type === 'window').length}</b> openings</span><span className="canvas-scale">1 grid square = {measurementSettings.perGrid} {measurementSettings.unit} / {measurementSettings.gridSize} canvas units</span></div>
        </div>

        <aside className="designer-inspector" aria-label="Properties and locations">
          <section className="location-library" aria-labelledby="location-library-title">
            <div className="library-heading"><div><p className="kicker">Location library</p><h2 id="location-library-title">Your places</h2></div></div>
            <p className="library-help">Drag a location onto the plan, or click to place it.</p>
            {locationError && !pendingArea && <p className="library-error" role="alert">{locationError}</p>}
            <div className="library-list">
              {locations.map((location) => {
                const isMapped = elements.some((element) => element.type === 'area' && element.locationId === location.id)
                return <button
                  key={location.id}
                  className={isMapped ? 'library-location is-mapped' : 'library-location'}
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData('application/x-toolbox-location', location.id)
                    event.dataTransfer.effectAllowed = 'copy'
                  }}
                  onClick={() => placeLocation(location)}
                ><span className="library-grip" aria-hidden="true">::</span><span><strong>{location.name}</strong><small>{locationPath(location, locations)}</small></span>{isMapped && <b>Mapped</b>}</button>
              })}
              {!locationError && locations.length === 0 && <p className="library-empty">No locations yet. Draw a rectangle to create one.</p>}
            </div>
          </section>
          <div className="inspector-heading"><p className="kicker">Inspector</p><h2>Properties</h2></div>
          {!selected && <div className="inspector-empty"><span className="inspector-empty-icon">+</span><strong>Nothing selected</strong><p>Select an object on the plan to adjust its size and position.</p></div>}
          {selected && <div className="inspector-content">
            <div className="selection-type"><span className={`selection-swatch selection-swatch--${selected.type}`} /><div><small>Selected</small><strong>{selected.type === 'area' ? selected.label : selected.type}</strong></div></div>
            {selected.type === 'area' && <label className="inspector-field"><span>Label</span><input value={selected.label} onChange={(event) => updateSelected({ label: event.target.value })} /></label>}
            {selected.type === 'area' ? <>
              <div className="inspector-field-row">
                <label className="inspector-field"><span>Width <small>{measurementSettings.unit}</small></span><input aria-label="Width" type="number" min={measurementSettings.perGrid} step={measurementSettings.perGrid} value={selected.width / measurementSettings.gridSize * measurementSettings.perGrid} onChange={(event) => updateSelected({ width: Math.max(measurementSettings.gridSize, Number(event.target.value) / measurementSettings.perGrid * measurementSettings.gridSize) })} /></label>
                <label className="inspector-field"><span>Height <small>{measurementSettings.unit}</small></span><input aria-label="Height" type="number" min={measurementSettings.perGrid} step={measurementSettings.perGrid} value={selected.height / measurementSettings.gridSize * measurementSettings.perGrid} onChange={(event) => updateSelected({ height: Math.max(measurementSettings.gridSize, Number(event.target.value) / measurementSettings.perGrid * measurementSettings.gridSize) })} /></label>
              </div>
              <div className="inspector-field-row">
                <label className="inspector-field"><span>X position</span><input type="number" step={measurementSettings.gridSize} value={selected.x} onChange={(event) => updateSelected({ x: Number(event.target.value) })} /></label>
                <label className="inspector-field"><span>Y position</span><input type="number" step={measurementSettings.gridSize} value={selected.y} onChange={(event) => updateSelected({ y: Number(event.target.value) })} /></label>
              </div>
            </> : <div className="measurement-card"><span>Length</span><strong>{formatMeasurement(lineLength(selected), measurementSettings).split(' ')[0]}</strong><small>{measurementSettings.unit}</small></div>}
            <div className="inspector-tip"><strong>Quick edit</strong><span>Drag the {selected.type === 'area' ? 'corner handles to resize' : 'end handles to reshape'}. Drag the object itself to move it.</span></div>
            <button className="delete-element" type="button" onClick={removeSelected}>Delete {selected.type}</button>
          </div>}
        </aside>
      </section>
      {pendingArea && <div className="designer-dialog-backdrop" role="presentation">
        <form className="designer-dialog" onSubmit={confirmNewLocation} role="dialog" aria-modal="true" aria-labelledby="new-space-title">
          <div className="dialog-mark" aria-hidden="true" />
          <p className="kicker">New rectangle</p>
          <h2 id="new-space-title">Name this space</h2>
          <p className="dialog-copy">This will also add a new location to your inventory.</p>
          <label className="inspector-field"><span>Name</span><input autoFocus required maxLength={200} value={newLocationName} onChange={(event) => setNewLocationName(event.target.value)} placeholder="e.g. Utility room" /></label>
          <label className="inspector-field"><span>Parent location <small>Optional</small></span><select value={newLocationParentId ?? ''} onChange={(event) => setNewLocationParentId(event.target.value || null)}><option value="">Top-level location</option>{locations.map((location) => <option key={location.id} value={location.id}>{locationPath(location, locations)}</option>)}</select></label>
          {locationError && <p className="dialog-error" role="alert">{locationError}</p>}
          <div className="dialog-actions"><button className="secondary-button" type="button" onClick={cancelNewLocation} disabled={creatingLocation}>Cancel</button><button className="primary-button" type="submit" disabled={creatingLocation}>{creatingLocation ? 'Creating...' : 'Create location'} <span aria-hidden="true">-&gt;</span></button></div>
        </form>
      </div>}
    </main>
  )
}
