const PATHS = {
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  flag: ['M5 21V4', 'M5 5h12l-2.5 4 2.5 4H5'],
}

interface GlyphProps {
  shape: keyof typeof PATHS
  size?: number
}

/** Le trait d'une coche ou d'un drapeau, à la couleur du texte qui le porte. */
export default function Glyph({ shape, size = 13 }: GlyphProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[shape].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  )
}
