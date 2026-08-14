'use client'

import { useCallback, useEffect, useState } from 'react'

/** Persists which optional table columns are visible to localStorage, keyed per table so the
 * Projections and Free Agents tables remember their own choice independently. Single
 * browser/user app - no backend needed for a display preference like this. */
export function useColumnPreferences<T extends string>(storageKey: string, defaultVisible: T[]) {
  const [visible, setVisible] = useState<T[]>(defaultVisible)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored) setVisible(JSON.parse(stored))
    } catch {
      // ignore malformed/unavailable storage, keep defaults
    }
  }, [storageKey])

  const toggle = useCallback((key: T) => {
    setVisible((previous) => {
      const next = previous.includes(key)
        ? previous.filter((value) => value !== key)
        : [...previous, key]

      try {
        localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        // ignore storage write failures (e.g. private browsing)
      }

      return next
    })
  }, [storageKey])

  return { visible, toggle }
}
