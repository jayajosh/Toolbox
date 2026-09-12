import { useState } from 'react'
import Papa from 'papaparse'
import { createFamily, importItems } from '../api'

type FamilyOption = { id: string; name: string; path: string }
type ParsedTool = { row: number; name: string; family: string; familyId: string | null; newFamilyKey: string | null }

type ImportToolsDialogProps = {
  families: FamilyOption[]
  unorganisedLocationId: string
  onClose: () => void
  onImported: (itemIds: string[]) => Promise<void>
}

function normalise(value: string) {
  return value.trim().toLocaleLowerCase()
}

export function ImportToolsDialog({ families, unorganisedLocationId, onClose, onImported }: ImportToolsDialogProps) {
  const [tools, setTools] = useState<ParsedTool[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [filename, setFilename] = useState('')
  const [busy, setBusy] = useState(false)

  function parseFile(file: File) {
    setFilename(file.name)
    setTools([])
    setErrors([])

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => normalise(header),
      complete: ({ data, errors: parseErrors, meta }) => {
        const nextErrors = parseErrors.map((error) => `Row ${(error.row ?? 0) + 2}: ${error.message}`)
        if (!meta.fields?.includes('name')) nextErrors.unshift('The CSV must include a name column.')
        if (data.length > 500) nextErrors.unshift('Imports are limited to 500 tools at a time.')

        const paths = new Map<string, FamilyOption[]>()
        const names = new Map<string, FamilyOption[]>()
        families.forEach((family) => {
          const pathKey = normalise(family.path)
          const nameKey = normalise(family.name)
          paths.set(pathKey, [...(paths.get(pathKey) ?? []), family])
          names.set(nameKey, [...(names.get(nameKey) ?? []), family])
        })

        const parsed = data.slice(0, 500).flatMap<ParsedTool>((row, index): ParsedTool[] => {
          const rowNumber = index + 2
          const name = row.name?.trim() ?? ''
          const familyName = row.family?.trim() ?? ''
          if (!name) {
            nextErrors.push(`Row ${rowNumber}: name is required.`)
            return []
          }
          if (name.length > 200) {
            nextErrors.push(`Row ${rowNumber}: name must be 200 characters or fewer.`)
            return []
          }
          if (!familyName) return [{ row: rowNumber, name, family: '', familyId: null, newFamilyKey: null }]

          const key = normalise(familyName)
          const matches = paths.get(key) ?? names.get(key) ?? []
          if (matches.length > 1) {
            nextErrors.push(`Row ${rowNumber}: family "${familyName}" is ambiguous; use its full path.`)
            return []
          }
          if (matches.length === 1) return [{ row: rowNumber, name, family: familyName, familyId: matches[0]!.id, newFamilyKey: null }]
          if (familyName.includes('/')) {
            nextErrors.push(`Row ${rowNumber}: family path "${familyName}" does not exist.`)
            return []
          }
          if (familyName.length > 160) {
            nextErrors.push(`Row ${rowNumber}: family must be 160 characters or fewer.`)
            return []
          }
          return [{ row: rowNumber, name, family: familyName, familyId: null, newFamilyKey: key }]
        })

        if (!data.length) nextErrors.push('The CSV does not contain any tools.')
        setTools(parsed)
        setErrors(nextErrors)
      },
      error: (reason) => setErrors([reason.message]),
    })
  }

  async function submit() {
    if (!tools.length || errors.length || busy) return
    setBusy(true)
    setErrors([])
    try {
      const createdFamilies = new Map<string, string>()
      for (const tool of tools) {
        if (!tool.newFamilyKey || createdFamilies.has(tool.newFamilyKey)) continue
        const family = await createFamily(tool.family)
        createdFamilies.set(tool.newFamilyKey, family.id)
      }
      const imported = await importItems(unorganisedLocationId, tools.map((tool) => ({
        name: tool.name,
        familyId: tool.familyId ?? (tool.newFamilyKey ? createdFamilies.get(tool.newFamilyKey) ?? null : null),
      })))
      await onImported(imported.map((item) => item.id))
    } catch (reason: unknown) {
      setErrors([reason instanceof Error ? reason.message : 'The tools could not be imported.'])
      setBusy(false)
    }
  }

  const missingFamilies = [...new Map(tools.filter((tool) => tool.newFamilyKey).map((tool) => [tool.newFamilyKey, tool.family])).values()]

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
    <section className="bulk-modal import-tools-modal" role="dialog" aria-modal="true" aria-labelledby="import-tools-title">
      <div className="bulk-modal-header">
        <div><p className="kicker">CSV import</p><h2 id="import-tools-title">Import tools</h2></div>
        <button className="modal-close" type="button" aria-label="Close import tools" disabled={busy} onClick={onClose}>&times;</button>
      </div>
      <div className="bulk-modal-body import-tools-body">
        <p>Upload a CSV with <strong>name</strong> and optional <strong>family</strong> columns. Tools are added to Unorganised, ready for bulk storage assignment.</p>
        <a className="text-button import-template-button" href="/toolbox-import-template.csv" download>Download CSV template</a>
        <label className="import-file-field">
          <span>CSV file</span>
          <input type="file" accept=".csv,text/csv" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) parseFile(file) }} />
        </label>
        {filename && <p className="import-file-name">{filename}</p>}
        {tools.length > 0 && !errors.length && <div className="import-summary" role="status">
          <strong>{tools.length} tool{tools.length === 1 ? '' : 's'} ready</strong>
          <span>Destination: Unorganised</span>
          <span>{missingFamilies.length ? `New families: ${missingFamilies.join(', ')}` : 'All families matched'}</span>
        </div>}
        {errors.length > 0 && <div className="bulk-error import-errors" role="alert">{errors.map((error) => <span key={error}>{error}</span>)}</div>}
      </div>
      <div className="bulk-modal-actions">
        <button className="secondary-button" type="button" disabled={busy} onClick={onClose}>Cancel</button>
        <button className="primary-button" type="button" disabled={!tools.length || errors.length > 0 || busy || !unorganisedLocationId} onClick={() => void submit()}>{busy ? 'Importing...' : `Import ${tools.length || ''} tools`}</button>
      </div>
    </section>
  </div>
}
