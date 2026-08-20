'use client'

import { useConfig } from '@payloadcms/ui'
import { useEffect, useState } from 'react'

export interface FrameIndexEntry {
  id: number
  caption: string | null
  location: string | null
  thumb: string | null
  full: string | null
  width: number | null
  height: number | null
  alt: string | null
  photographerId: number | null
  photographerName: string | null
  credit: string | null
}

export interface FramesIndex {
  byId: Map<number, FrameIndexEntry>
  error: string | null
  frames: FrameIndexEntry[] | null
}

// Module-level cache: the sequence editor and the lead-frame field mount as
// independent custom fields on the same document view, so a shared promise
// keeps this to one request per page load.
let cached: Promise<FrameIndexEntry[]> | null = null

const fetchIndex = (url: string): Promise<FrameIndexEntry[]> => {
  if (!cached) {
    cached = fetch(url, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`frames-index responded ${res.status}`)
        const body = (await res.json()) as { frames: FrameIndexEntry[] }
        return body.frames
      })
      .catch((err) => {
        cached = null // allow a retry on remount
        throw err
      })
  }
  return cached
}

/** Resolve a possibly-relative media URL against the CMS origin. */
export const resolveMediaUrl = (url: string | null, serverURL: string): string | null => {
  if (!url) return null
  return url.startsWith('/') ? `${serverURL}${url}` : url
}

export const useFramesIndex = (): FramesIndex => {
  const {
    config: {
      routes: { api },
      serverURL,
    },
  } = useConfig()
  const [frames, setFrames] = useState<FrameIndexEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetchIndex(`${serverURL}${api}/frames-index`)
      .then((docs) => {
        if (alive) setFrames(docs)
      })
      .catch((err: Error) => {
        if (alive) setError(err.message)
      })
    return () => {
      alive = false
    }
  }, [api, serverURL])

  return {
    byId: new Map((frames ?? []).map((f) => [f.id, f])),
    error,
    frames,
  }
}
