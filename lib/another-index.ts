/** Un autre index que l'actuel, au hasard ; le même s'il n'y a pas le choix */
export function anotherIndex(current: number, count: number): number {
  if (count < 2) return current
  const offset = 1 + Math.floor(Math.random() * (count - 1))
  return (current + offset) % count
}
