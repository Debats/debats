interface ShareIconProps {
  size: number
  /** The tick shown for a moment once something was copied */
  done?: boolean
}

/** The glyph of sharing: a tray and an arrow out of it, or a tick once it is done. */
export default function ShareIcon({ size, done = false }: ShareIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {done ? (
        <polyline points="20 6 9 17 4 12" />
      ) : (
        <>
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </>
      )}
    </svg>
  )
}
