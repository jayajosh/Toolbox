import { useEffect, useRef, useState } from 'react'
import type { Tag } from '../types'

type TagPickerProps = {
  tags: Tag[]
  selectedTagIds: string[]
  onChange: (tagIds: string[]) => void
  onCreateTag: (name: string) => Promise<Tag>
  onDeleteTag: (tag: Tag) => Promise<void>
}

export function TagPicker({ tags, selectedTagIds, onChange, onCreateTag, onDeleteTag }: TagPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const selected = selectedTagIds
    .map((id) => tags.find((tag) => tag.id === id))
    .filter((tag): tag is Tag => Boolean(tag))
  const filtered = tags.filter((tag) => tag.name.toLowerCase().includes(search.trim().toLowerCase()))

  useEffect(() => {
    if (!open) return
    function dismiss(event: MouseEvent) {
      if (event.target instanceof Node && !pickerRef.current?.contains(event.target)) setOpen(false)
    }
    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', dismiss)
    document.addEventListener('keydown', dismissOnEscape)
    return () => {
      document.removeEventListener('mousedown', dismiss)
      document.removeEventListener('keydown', dismissOnEscape)
    }
  }, [open])

  function toggle(tag: Tag) {
    const next = selectedTagIds.includes(tag.id)
      ? selectedTagIds.filter((id) => id !== tag.id)
      : [...selectedTagIds, tag.id]
    onChange(next)
    setSearch('')
    inputRef.current?.focus()
  }

  async function addTag() {
    const name = search.trim()
    if (!name) {
      setError('Type a name before adding a tag.')
      inputRef.current?.focus()
      return
    }
    setCreating(true)
    setError(null)
    try {
      const tag = await onCreateTag(name)
      onChange([...selectedTagIds, tag.id])
      setSearch('')
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Could not add that tag.')
    } finally {
      setCreating(false)
    }
  }

  async function deleteTag(tag: Tag) {
    if (!window.confirm(`Delete the tag "${tag.name}"? It can only be deleted when it is not assigned to any items.`)) return
    setDeletingId(tag.id)
    setError(null)
    try {
      await onDeleteTag(tag)
      onChange(selectedTagIds.filter((id) => id !== tag.id))
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Could not delete that tag.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="field">
      <span>Tags <small>Optional, choose any number</small></span>
      <div ref={pickerRef} className="tag-picker">
        <div className="tag-chips">
          {selected.map((tag) => (
            <button className="tag-chip" key={tag.id} type="button" onClick={() => toggle(tag)}>
              {tag.name}<span aria-hidden="true">x</span>
            </button>
          ))}
          <input
            ref={inputRef}
            value={search}
            onChange={(event) => { setSearch(event.target.value); setOpen(true); setError(null) }}
            onFocus={() => setOpen(true)}
            placeholder={selected.length ? 'Add another tag...' : 'Search or add a tag...'}
            aria-label="Search or add a tag"
          />
        </div>
        {open && (
          <div className="tag-menu">
            <button className="add-option" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => void addTag()} disabled={creating}>
              <span>+</span> {creating ? 'Adding tag...' : search.trim() ? `Add "${search.trim()}"` : 'Add a new tag'}
            </button>
            {filtered.length > 0 && <p className="menu-label">Existing tags</p>}
            {filtered.map((tag) => (
              <div className={`tag-option${selectedTagIds.includes(tag.id) ? ' is-selected' : ''}`} key={tag.id}>
                <label className="tag-option-select">
                  <input type="checkbox" checked={selectedTagIds.includes(tag.id)} onChange={() => toggle(tag)} />
                  <span>{tag.name}</span>
                </label>
                <button className="tag-option-delete" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => void deleteTag(tag)} disabled={deletingId === tag.id} aria-label={`Delete tag ${tag.name}`}>{deletingId === tag.id ? '...' : 'Delete'}</button>
              </div>
            ))}
            {filtered.length === 0 && search.trim() && <p className="menu-empty">No matching tags. Add it above.</p>}
            {error && <p className="picker-error">{error}</p>}
          </div>
        )}
      </div>
      <p className="field-hint">Tags make broad searches like "power tools" or "electrical" instant.</p>
    </div>
  )
}
