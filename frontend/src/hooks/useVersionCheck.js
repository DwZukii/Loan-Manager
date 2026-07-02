import { useState, useEffect, useRef } from 'react'

const POLL_INTERVAL_MS = 15_000 // check every 15 seconds

export function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const currentVersion = useRef(null)

  useEffect(() => {
    // Fetch the version once on mount to record what the user loaded with
    const fetchVersion = async () => {
      try {
        // Cache-bust so we always get the real file, not a cached copy
        const res = await fetch(`/version.json?t=${Date.now()}`)
        if (!res.ok) return
        const data = await res.json()
        return data.version
      } catch {
        return null
      }
    }

    const init = async () => {
      const version = await fetchVersion()
      if (version) currentVersion.current = version
    }

    init()

    // Poll on interval
    const interval = setInterval(async () => {
      const version = await fetchVersion()
      if (!version || !currentVersion.current) return

      if (version !== currentVersion.current) {
        setUpdateAvailable(true)
        clearInterval(interval) // stop polling — we already know there's an update
      }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [])

  return updateAvailable
}
