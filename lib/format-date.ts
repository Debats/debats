import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

/** Date longue en français, ex. « 14 novembre 2023 ». */
export function formatDate(date: Date): string {
  return format(date, 'd MMMM yyyy', { locale: fr })
}

/** Date courte en français, ex. « 14 nov. 2023 ». */
export function formatShortDate(date: Date): string {
  return format(date, 'd MMM yyyy', { locale: fr })
}
