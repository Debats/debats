const FORMAT = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' })

/** An amount in US cents, written as dollars the French way: « 21,73 $US » */
export const dollars = (cents: number): string => FORMAT.format(cents / 100)
