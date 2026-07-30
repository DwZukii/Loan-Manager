import { useEffect, useRef, useState } from 'react'

/**
 * NavSlider — animated sliding pill indicator for top navbars.
 *
 * Props:
 *  - activeTab  : string   — current active tab id
 *  - tabs       : Array<{ id: string, label: string, badge?: string|number|null }>
 *  - onSelect   : (id: string) => void
 */
export default function NavSlider({ activeTab, tabs, onSelect }) {
  const containerRef = useRef(null)
  const btnRefs = useRef([])
  const [slider, setSlider] = useState({ left: 0, width: 0, ready: false })

  useEffect(() => {
    const idx = tabs.findIndex(t => t.id === activeTab)
    const btn = btnRefs.current[idx]
    const container = containerRef.current
    if (!btn || !container) return

    const containerRect = container.getBoundingClientRect()
    const btnRect = btn.getBoundingClientRect()

    setSlider({
      left: btnRect.left - containerRect.left,
      width: btnRect.width,
      ready: true,
    })
  }, [activeTab, tabs])

  return (
    <div
      ref={containerRef}
      className="relative hidden lg:flex items-center gap-1 p-1 rounded animate-nav-entry"
      style={{ background: 'rgba(255,255,255,0.08)' }}
    >
      {/* Sliding white pill — renders behind buttons */}
      {slider.ready && (
        <span
          aria-hidden="true"
          className="absolute top-1 bottom-1 bg-white shadow-md pointer-events-none"
          style={{
            left: slider.left,
            width: slider.width,
            borderRadius: '2px',
            transition: 'left 220ms cubic-bezier(0.4,0,0.2,1), width 220ms cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      )}

      {tabs.map((tab, i) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            ref={el => { btnRefs.current[i] = el }}
            onClick={() => onSelect(tab.id)}
            className={`relative flex items-center gap-1.5 px-4 py-1.5 text-sm font-bold transition-colors duration-150 ${
              isActive ? 'text-indigo-900' : 'text-indigo-200 hover:text-white'
            }`}
            style={{ borderRadius: '2px' }}
          >
            {tab.label}
            {tab.badge != null && (
              <span className="bg-rose-500 text-white rounded-full px-2 py-0.5 text-[10px] font-black leading-none">
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
