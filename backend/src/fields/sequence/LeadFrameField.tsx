'use client'

import type { RelationshipFieldClientProps } from 'payload'

import {
  Collapsible,
  DrawerToggler,
  RelationshipField,
  useConfig,
  useDrawerSlug,
  useField,
} from '@payloadcms/ui'
import React, { useMemo } from 'react'

import { FramePickerDrawer } from './FramePickerDrawer'
import { resolveMediaUrl, useFramesIndex } from './useFramesIndex'
import './sequence-editor.scss'

/**
 * Visual single-select for the essay's lead frame: current pick as a
 * thumbnail, "Choose frame" opens the shared picker grid. The stock
 * relationship input stays available in a collapsible as the escape hatch.
 */
export const LeadFrameField: React.FC<RelationshipFieldClientProps> = (props) => {
  const { field, path: pathFromProps, readOnly } = props
  const { setValue, value } = useField<number | { id: number } | null>({
    potentiallyStalePath: pathFromProps,
  })
  const { byId, error, frames } = useFramesIndex()
  const {
    config: { serverURL },
  } = useConfig()
  const drawerSlug = useDrawerSlug('lead-frame-picker')

  const currentId = value == null ? null : typeof value === 'object' ? value.id : value
  const entry = currentId != null ? byId.get(currentId) : null
  const thumb = resolveMediaUrl(entry?.thumb ?? null, serverURL)
  const usedIds = useMemo(() => new Set<number>(currentId != null ? [currentId] : []), [currentId])

  return (
    <div className="seq-editor seq-lead field-type">
      <header className="seq-editor__head">
        <h3 className="seq-editor__label">
          {typeof field.label === 'string' ? field.label : 'Lead frame'}
        </h3>
        {!readOnly && (
          <DrawerToggler className="seq-editor__add btn btn--style-primary btn--size-small" slug={drawerSlug}>
            {currentId ? 'Change frame' : 'Choose frame'}
          </DrawerToggler>
        )}
        {!readOnly && currentId != null && (
          <button className="seq-lead__clear" onClick={() => setValue(null)} type="button">
            Clear
          </button>
        )}
      </header>

      {error && <p className="seq-error">Thumbnails unavailable ({error}).</p>}

      {currentId == null ? (
        <p className="seq-muted">No lead frame chosen.</p>
      ) : (
        <div className="seq-lead__current">
          {thumb ? (
            <img alt={entry?.alt ?? ''} className="seq-thumb" src={thumb} />
          ) : (
            <span className="seq-thumb seq-thumb--missing">
              {frames ? (entry?.caption ?? `Frame ${currentId}`) : 'Loading…'}
            </span>
          )}
          <span className="seq-tile__title">{entry?.caption ?? entry?.location ?? `Frame ${currentId}`}</span>
        </div>
      )}

      {!readOnly && (
        <FramePickerDrawer
          drawerSlug={drawerSlug}
          mode="single"
          onConfirm={(ids) => setValue(ids[0] ?? null)}
          title="Choose the lead frame"
          usedIds={usedIds}
        />
      )}

      <Collapsible className="seq-editor__structural" header="Pick by name" initCollapsed>
        <RelationshipField {...props} />
      </Collapsible>
    </div>
  )
}
