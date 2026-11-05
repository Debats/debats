/** Mise en forme des parts et des écarts, en points entiers. */

export const percent = (share: number) => `${Math.round(share * 100)} %`

export const signed = (deviation: number) => {
  const points = Math.round(deviation * 100)
  return points > 0 ? `+${points}` : String(points)
}
