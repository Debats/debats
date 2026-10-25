/** The calendar day of a date, as the events carry it (`2024-01-15`) */
export const isoDate = (date: Date): string => date.toISOString().slice(0, 10)
