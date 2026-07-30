// Shared Suspense fallback used by all lazy-loaded tab components
export default function LazySpinner({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4 text-indigo-300">
      <svg
        className="w-8 h-8 animate-spin"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12" cy="12" r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v8z"
        />
      </svg>
      <span className="text-sm font-bold uppercase tracking-widest">{label}</span>
    </div>
  )
}
