import type { CSSProperties } from 'react'
import type { Location } from '../types'

type Point = { x: number; y: number }
type PlanElement =
  | { id: string; type: 'wall'; start: Point; end: Point }
  | { id: string; type: 'area'; x: number; y: number; width: number; height: number; label: string; locationId?: string }
  | { id: string; type: 'door' | 'garageDoor' | 'window'; start: Point; end: Point }

const PLAN_STORAGE_KEY = 'toolbox-space-plan-v1'
const WORLD_WIDTH = 1200
const WORLD_HEIGHT = 760

const previewPlan: PlanElement[] = [
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

function getPlan() {
  try {
    const saved = window.localStorage.getItem(PLAN_STORAGE_KEY)
    const parsed: unknown = saved ? JSON.parse(saved) : previewPlan
    return Array.isArray(parsed) ? parsed as PlanElement[] : previewPlan
  } catch {
    return previewPlan
  }
}

type MapPanelProps = {
  locations: Location[]
  selectedLocationId: string | null
  onSelectLocation: (id: string | null) => void
  onAddLocation?: () => void
  onDesignSpace?: () => void
}

export function MapPanel({ locations, selectedLocationId, onSelectLocation, onAddLocation, onDesignSpace }: MapPanelProps) {
  const plan = getPlan()
  const locationsById = new Map(locations.map((location) => [location.id, location]))
  const mappedLocationIds = new Set(plan.flatMap((element) => element.type === 'area' && element.locationId ? [element.locationId] : []))
  let selectedLocation = selectedLocationId ? locationsById.get(selectedLocationId) : undefined
  while (selectedLocation && !mappedLocationIds.has(selectedLocation.id)) {
    selectedLocation = selectedLocation.parentLocationId ? locationsById.get(selectedLocation.parentLocationId) : undefined
  }

  return (
    <section className="map-card" aria-labelledby="map-title">
         <div className="card-topline">
           <div>
             <h2 id="map-title">Floor plan</h2>
           </div>
        {(onAddLocation || onDesignSpace) && <div className="map-header-actions">
          {onAddLocation && <button className="map-add-button" type="button" onClick={onAddLocation}><span aria-hidden="true">+</span> Add container</button>}
        </div>}
      </div>
      <div className="map-canvas" aria-label="Floor plan preview">
         <svg viewBox={`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`} role="img" aria-label="Saved floor plan">
          <defs><pattern id="preview-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" /></pattern></defs>
          <rect width={WORLD_WIDTH} height={WORLD_HEIGHT} className="preview-background" />
          <rect width={WORLD_WIDTH} height={WORLD_HEIGHT} fill="url(#preview-grid)" className="preview-grid" />
          {plan.map((element) => {
            if (element.type === 'area') {
              const linkedLocation = element.locationId ? locationsById.get(element.locationId) : undefined
              const isSelected = linkedLocation?.id === selectedLocation?.id
              return <g key={element.id} className={`preview-area${isSelected ? ' is-selected' : ''}`} onClick={() => linkedLocation && onSelectLocation(isSelected ? null : linkedLocation.id)}>
                <rect style={{ '--area-color': linkedLocation?.color ?? '#728a77' } as CSSProperties} x={element.x} y={element.y} width={element.width} height={element.height} />
                {element.width > 75 && element.height > 48 && <text x={element.x + element.width / 2} y={element.y + element.height / 2}>{element.label}</text>}
              </g>
            }
            if (element.type === 'wall') return <line key={element.id} className="preview-wall" x1={element.start.x} y1={element.start.y} x2={element.end.x} y2={element.end.y} />
            if (element.type === 'window') return <line key={element.id} className="preview-window" x1={element.start.x} y1={element.start.y} x2={element.end.x} y2={element.end.y} />
            return <line key={element.id} className={element.type === 'garageDoor' ? 'preview-garage-door' : 'preview-door'} x1={element.start.x} y1={element.start.y} x2={element.end.x} y2={element.end.y} />
          })}
        </svg>
      </div>
        <div className="map-footer"><div><span className="map-key map-key--active" /> {selectedLocation ? `Selected: ${selectedLocation.name}` : 'Saved floor plan'}</div>{onDesignSpace && <button className="text-button" type="button" onClick={onDesignSpace}>Open floor plan &rarr;</button>}</div>
    </section>
  )
}
