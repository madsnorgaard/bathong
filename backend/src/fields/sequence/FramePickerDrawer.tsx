'use client'

import { Button, Drawer, useConfig, useModal } from '@payloadcms/ui'
import React, { useEffect, useMemo, useState } from 'react'

import type { FrameIndexEntry } from './useFramesIndex'
import { resolveMediaUrl, useFramesIndex } from './useFramesIndex'

/**
 * A visual frame picker inside a Payload drawer. Multi mode collects clicks
 * in order and appends on confirm; single mode confirms on first click.
 * Frames already in the sequence are marked "in sequence" but stay
 * selectable, since a frame can legitimately repeat.
 */
export const FramePickerDrawer: React.FC<{
  drawerSlug: string
  mode: 'multi' | 'single'
  onConfirm: (ids: number[]) => void
  title: string
  usedIds: Set<number>
}> = ({ drawerSlug, mode, onConfirm, title, usedIds }) => {
  const { byId, error, frames } = useFramesIndex()
  const {
    config: { serverURL },
  } = useConfig()
  const { closeModal, modalState } = useModal()
  const isOpen = Boolean(modalState[drawerSlug]?.isOpen)

  const [search, setSearch] = useState('')
  const [photographer, setPhotographer] = useState<'all' | number>('all')
  const [picked, setPicked] = useState<number[]>([])

  // Fresh selection every time the drawer opens.
  useEffect(() => {
    if (isOpen) setPicked([])
  }, [isOpen])

  const photographers = useMemo(() => {
    const seen = new Map<number, string>()
    for (const f of frames ?? []) {
      if (f.photographerId != null && f.photographerName) seen.set(f.photographerId, f.photographerName)
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [frames])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (frames ?? []).filter((f) => {
      if (photographer !== 'all' && f.photographerId !== photographer) return false
      if (!q) return true
      return [f.caption, f.location, f.credit].some((s) => s?.toLowerCase().includes(q))
    })
  }, [frames, photographer, search])

  const toggle = (id: number) => {
    if (mode === 'single') {
      onConfirm([id])
      closeModal(drawerSlug)
      return
    }
    setPicked((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
  }

  const confirm = () => {
    if (picked.length) onConfirm(picked)
    closeModal(drawerSlug)
  }

  return (
    <Drawer slug={drawerSlug} title={title}>
      <div className="seq-picker">
        <div className="seq-picker__controls">
          <input
            className="seq-picker__search"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search caption, location, credit"
            type="search"
            value={search}
          />
          <select
            className="seq-picker__filter"
            onChange={(e) => setPhotographer(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            value={String(photographer)}
          >
            <option value="all">All photographers</option>
            {photographers.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          {mode === 'multi' && (
            <Button buttonStyle="primary" disabled={!picked.length} onClick={confirm}>
              {picked.length ? `Add ${picked.length} frame${picked.length === 1 ? '' : 's'}` : 'Add frames'}
            </Button>
          )}
        </div>

        {error && <p className="seq-error">The frame index failed to load: {error}</p>}
        {!error && !frames && <p className="seq-muted">Loading frames…</p>}
        {frames?.length === 0 && <p className="seq-muted">No frames yet - create some under Work → Frames.</p>}

        <div className="seq-picker__grid">
          {visible.map((f) => {
            const order = picked.indexOf(f.id)
            return (
              <button
                aria-pressed={order > -1}
                className={[
                  'seq-picker__tile',
                  order > -1 && 'is-picked',
                  usedIds.has(f.id) && 'is-used',
                ]
                  .filter(Boolean)
                  .join(' ')}
                key={f.id}
                onClick={() => toggle(f.id)}
                type="button"
              >
                <PickerThumb frame={f} serverURL={serverURL} />
                {order > -1 && <span className="seq-picker__order">{order + 1}</span>}
                {usedIds.has(f.id) && <span className="seq-picker__used">in sequence</span>}
                <span className="seq-tile__title">{f.caption ?? f.location ?? `Frame ${f.id}`}</span>
              </button>
            )
          })}
        </div>
      </div>
    </Drawer>
  )
}

const PickerThumb: React.FC<{ frame: FrameIndexEntry; serverURL: string }> = ({ frame, serverURL }) => {
  const [failed, setFailed] = useState(false)
  const src = resolveMediaUrl(frame.thumb, serverURL)
  if (!src || failed) {
    return <span className="seq-thumb seq-thumb--missing">no preview</span>
  }
  return (
    <img
      alt={frame.alt ?? ''}
      className="seq-thumb"
      draggable={false}
      loading="lazy"
      onError={() => setFailed(true)}
      src={src}
    />
  )
}
