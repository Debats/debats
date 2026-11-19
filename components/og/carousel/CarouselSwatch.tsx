import { row } from './styles'

interface CarouselSwatchProps {
  colour: string
  label: string
  /** The colour of the label, when it is not the ink of the slide */
  quiet?: string
}

/** One entry of a legend: a square of the colour, and what it stands for */
export default function CarouselSwatch({ colour, label, quiet }: CarouselSwatchProps) {
  return (
    <div style={row(12)}>
      <div
        style={{
          width: '26px',
          height: '26px',
          borderRadius: '6px',
          flexShrink: 0,
          backgroundColor: colour,
        }}
      />
      <span style={{ fontSize: '24px', ...(quiet ? { color: quiet } : {}) }}>{label}</span>
    </div>
  )
}
