'use client'

import type { BlocksFieldClientProps, FormState } from 'payload'

import {
  BlocksField,
  Collapsible,
  DraggableSortable,
  DraggableSortableItem,
  DrawerToggler,
  useAllFormFields,
  useConfig,
  useDrawerSlug,
  useField,
  useForm,
} from '@payloadcms/ui'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { FramePickerDrawer } from './FramePickerDrawer'
import { resolveMediaUrl, useFramesIndex } from './useFramesIndex'
import './sequence-editor.scss'

/** The three block shapes of the Essays sequence field, as form data. */
interface SequenceBlockData {
  blockType: 'frame' | 'pair' | 'text'
  body?: unknown
  captionOverride?: string | null
  frame?: number | { id: number } | null
  fullBleed?: boolean | null
  id?: string
  left?: number | { id: number } | null
  right?: number | { id: number } | null
}

const relId = (v: SequenceBlockData['frame']): number | null =>
  v == null ? null : typeof v === 'object' ? v.id : v

/** First ~90 chars of plain text from a lexical richText doc. */
const lexicalExcerpt = (body: unknown): string => {
  const root = (body as { root?: { children?: unknown[] } } | null)?.root
  const out: string[] = []
  const walk = (nodes: unknown[]) => {
    for (const n of nodes) {
      const node = n as { children?: unknown[]; text?: string }
      if (typeof node.text === 'string') out.push(node.text)
      if (Array.isArray(node.children)) walk(node.children)
    }
  }
  if (Array.isArray(root?.children)) walk(root.children)
  const text = out.join(' ').trim()
  return text.length > 90 ? `${text.slice(0, 90)}…` : text || 'Empty text block'
}

const TILE_SIZES = ['s', 'm', 'l'] as const
type TileSize = (typeof TILE_SIZES)[number]

export const SequenceEditor: React.FC<BlocksFieldClientProps> = (props) => {
  const { field, path: pathFromProps, readOnly, schemaPath } = props
  const { path, rows = [] } = useField({ hasRows: true, potentiallyStalePath: pathFromProps })
  const { addFieldRow, dispatchFields, getDataByPath, moveFieldRow, removeFieldRow, setModified } =
    useForm()
  // Subscribe to the whole form so the strip mirrors edits made in the
  // structural editor below (both write the same form state).
  const [formFields] = useAllFormFields()
  const blocks = useMemo(
    () => getDataByPath<SequenceBlockData[]>(path) ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- formFields is the change signal
    [formFields, getDataByPath, path],
  )

  const { byId, error: indexError, frames } = useFramesIndex()
  const {
    config: { serverURL },
  } = useConfig()
  const drawerSlug = useDrawerSlug('seq-picker')

  const [tileSize, setTileSize] = useState<TileSize>('m')
  useEffect(() => {
    const stored = window.localStorage.getItem('bathong-seq-tile') as TileSize | null
    if (stored && TILE_SIZES.includes(stored)) setTileSize(stored)
  }, [])
  const pickTileSize = (s: TileSize) => {
    setTileSize(s)
    window.localStorage.setItem('bathong-seq-tile', s)
  }

  const [lightbox, setLightbox] = useState<{ caption: string; src: string } | null>(null)
  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setLightbox(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  const frameCount = blocks.reduce(
    (n, b) => n + (b.blockType === 'frame' ? 1 : b.blockType === 'pair' ? 2 : 0),
    0,
  )

  const usedIds = useMemo(() => {
    const ids = new Set<number>()
    for (const b of blocks) {
      for (const v of [b.frame, b.left, b.right]) {
        const id = relId(v)
        if (id != null) ids.add(id)
      }
    }
    return ids
  }, [blocks])

  const appendFrames = useCallback(
    (frameIds: number[]) => {
      const base = blocks.length
      frameIds.forEach((frameId, k) => {
        const subFieldState: FormState = {
          frame: { initialValue: frameId, valid: true, value: frameId },
          fullBleed: { initialValue: false, valid: true, value: false },
        }
        addFieldRow({
          blockType: 'frame',
          path,
          rowIndex: base + k,
          schemaPath: schemaPath ?? field.name,
          subFieldState,
        })
      })
    },
    [addFieldRow, blocks.length, field.name, path, schemaPath],
  )

  const toggleBleed = useCallback(
    (rowIndex: number, current: boolean) => {
      dispatchFields({ type: 'UPDATE', path: `${path}.${rowIndex}.fullBleed`, value: !current })
      setModified(true)
    },
    [dispatchFields, path, setModified],
  )

  const move = useCallback(
    (from: number, to: number) => {
      if (to < 0 || to >= blocks.length) return
      moveFieldRow({ moveFromIndex: from, moveToIndex: to, path })
    },
    [blocks.length, moveFieldRow, path],
  )

  // Running frame numbers: a pair takes two, text takes none.
  const startNumbers: number[] = []
  let counter = 0
  for (const b of blocks) {
    startNumbers.push(counter + 1)
    counter += b.blockType === 'frame' ? 1 : b.blockType === 'pair' ? 2 : 0
  }

  const openLightbox = (frameId: number | null) => {
    const entry = frameId != null ? byId.get(frameId) : null
    const src = resolveMediaUrl(entry?.full ?? entry?.thumb ?? null, serverURL)
    if (entry && src) setLightbox({ caption: entry.caption ?? entry.location ?? '', src })
  }

  const thumbFor = (frameId: number | null) => {
    const entry = frameId != null ? byId.get(frameId) : null
    return {
      alt: entry?.alt ?? '',
      src: resolveMediaUrl(entry?.thumb ?? null, serverURL),
      title: entry?.caption ?? entry?.location ?? (frameId != null ? `Frame ${frameId}` : 'No frame'),
    }
  }

  return (
    <div className={`seq-editor seq-editor--${tileSize} field-type`}>
      <header className="seq-editor__head">
        <h3 className="seq-editor__label">{typeof field.label === 'string' ? field.label : 'Sequence'}</h3>
        <span className={`seq-editor__count ${frameCount >= 12 && frameCount <= 20 ? 'in-range' : ''}`}>
          {frameCount} frame{frameCount === 1 ? '' : 's'} · guidance 12-20
        </span>
        <span className="seq-editor__sizes" role="group" aria-label="Thumbnail size">
          {TILE_SIZES.map((s) => (
            <button
              aria-pressed={tileSize === s}
              className={tileSize === s ? 'is-active' : ''}
              key={s}
              onClick={() => pickTileSize(s)}
              type="button"
            >
              {s.toUpperCase()}
            </button>
          ))}
        </span>
        {!readOnly && (
          <DrawerToggler className="seq-editor__add btn btn--style-primary btn--size-small" slug={drawerSlug}>
            + Add frames
          </DrawerToggler>
        )}
      </header>

      {indexError && (
        <p className="seq-error">
          Thumbnails unavailable ({indexError}) - the structural editor below still works.
        </p>
      )}
      {field.admin?.description && typeof field.admin.description === 'string' && (
        <p className="seq-muted seq-editor__description">{field.admin.description}</p>
      )}

      {blocks.length === 0 ? (
        <p className="seq-muted seq-editor__empty">
          No frames yet. Add the first ones and drag to set the order.
        </p>
      ) : (
        <DraggableSortable
          className="seq-editor__strip"
          ids={rows.map((r) => r.id)}
          onDragEnd={({ moveFromIndex, moveToIndex }) => move(moveFromIndex, moveToIndex)}
        >
          {blocks.map((block, i) => {
            const row = rows[i]
            if (!row) return null
            const bleed = Boolean(block.fullBleed)
            return (
              <DraggableSortableItem disabled={readOnly} id={row.id} key={row.id}>
                {({ attributes, isDragging, listeners, setNodeRef, transform, transition }) => (
                  <div
                    className={[
                      'seq-tile',
                      `seq-tile--${block.blockType}`,
                      bleed && 'seq-tile--bleed',
                      isDragging && 'is-dragging',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    ref={setNodeRef}
                    style={{ transform, transition }}
                  >
                    <div className="seq-tile__media" {...attributes} {...listeners}>
                      {block.blockType === 'frame' && (
                        <TileImage
                          onOpen={() => openLightbox(relId(block.frame))}
                          {...thumbFor(relId(block.frame))}
                        />
                      )}
                      {block.blockType === 'pair' && (
                        <span className="seq-tile__pair">
                          <TileImage
                            onOpen={() => openLightbox(relId(block.left))}
                            {...thumbFor(relId(block.left))}
                          />
                          <TileImage
                            onOpen={() => openLightbox(relId(block.right))}
                            {...thumbFor(relId(block.right))}
                          />
                        </span>
                      )}
                      {block.blockType === 'text' && (
                        <span className="seq-tile__text">{lexicalExcerpt(block.body)}</span>
                      )}
                    </div>

                    <div className="seq-tile__meta">
                      <span className="seq-tile__pos">
                        {block.blockType === 'text'
                          ? 'text'
                          : block.blockType === 'pair'
                            ? `${String(startNumbers[i]).padStart(2, '0')}+${String(startNumbers[i] + 1).padStart(2, '0')}`
                            : String(startNumbers[i]).padStart(2, '0')}
                      </span>
                      <span className="seq-tile__title">
                        {block.blockType === 'frame' && thumbFor(relId(block.frame)).title}
                        {block.blockType === 'pair' && 'Pair'}
                        {block.blockType === 'text' && 'Text interlude'}
                      </span>
                    </div>

                    {!readOnly && (
                      <div className="seq-tile__controls">
                        <button
                          aria-label={`Move position ${i + 1} earlier`}
                          disabled={i === 0}
                          onClick={() => move(i, i - 1)}
                          title="Move earlier"
                          type="button"
                        >
                          ‹
                        </button>
                        {block.blockType === 'frame' && (
                          <button
                            aria-pressed={bleed}
                            className={bleed ? 'is-active' : ''}
                            onClick={() => toggleBleed(i, bleed)}
                            title="Full bleed (at most two per essay)"
                            type="button"
                          >
                            bleed
                          </button>
                        )}
                        <button
                          aria-label={`Remove position ${i + 1}`}
                          className="seq-tile__remove"
                          onClick={() => removeFieldRow({ path, rowIndex: i })}
                          title="Remove from sequence"
                          type="button"
                        >
                          ×
                        </button>
                        <button
                          aria-label={`Move position ${i + 1} later`}
                          disabled={i === blocks.length - 1}
                          onClick={() => move(i, i + 1)}
                          title="Move later"
                          type="button"
                        >
                          ›
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </DraggableSortableItem>
            )
          })}
        </DraggableSortable>
      )}

      {!readOnly && (
        <FramePickerDrawer
          drawerSlug={drawerSlug}
          mode="multi"
          onConfirm={appendFrames}
          title="Add frames to the sequence"
          usedIds={usedIds}
        />
      )}

      <Collapsible
        className="seq-editor__structural"
        header="Structural editor (pairs, text, captions)"
        initCollapsed
      >
        <BlocksField {...props} />
      </Collapsible>

      {lightbox && (
        <div
          aria-label="Close preview"
          className="seq-lightbox"
          onClick={() => setLightbox(null)}
          role="button"
          tabIndex={0}
        >
          <img alt={lightbox.caption} src={lightbox.src} />
          {lightbox.caption && <p>{lightbox.caption}</p>}
        </div>
      )}
      {/* Non-editors should never see a broken strip while the index loads. */}
      {!frames && !indexError && blocks.length > 0 && (
        <p className="seq-muted">Loading thumbnails…</p>
      )}
    </div>
  )
}

const TileImage: React.FC<{
  alt: string
  onOpen: () => void
  src: string | null
  title: string
}> = ({ alt, onOpen, src, title }) => {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return <span className="seq-thumb seq-thumb--missing">{title}</span>
  }
  return (
    <img
      alt={alt}
      className="seq-thumb"
      // Native image dragging would swallow the pointer events dnd-kit needs.
      draggable={false}
      loading="lazy"
      onClick={(e) => {
        // Distinguish click from drag: dnd-kit suppresses click after a real
        // drag, so a surviving click means "open".
        e.stopPropagation()
        onOpen()
      }}
      onError={() => setFailed(true)}
      src={src}
    />
  )
}
