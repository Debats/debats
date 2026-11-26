import { Chantier } from '../entities/chantier'

/** What the list of chantiers shows: the closed ones only on demand */
export interface ChantierListView {
  withClosed: boolean
}

export interface ChantierListParams {
  vue?: string | string[]
}

const ALL = 'tous'

export const parseChantierListView = ({ vue }: ChantierListParams): ChantierListView => ({
  withClosed: vue === ALL,
})

/** The query string that asks for a view: empty for the default one */
export const chantierListQuery = ({ withClosed }: ChantierListView): string =>
  withClosed ? `?vue=${ALL}` : ''

export interface ChantierList {
  shown: Chantier[]
  /** How many chantiers a person closed, shown or not: what the link to the other view announces */
  closedCount: number
}

const isClosed = ({ status }: Chantier) => status === 'closed'

/** The chantiers a view shows, in the order received. An ended session stays: only a person closes a chantier */
export function listChantiers(all: readonly Chantier[], view: ChantierListView): ChantierList {
  return {
    shown: all.filter((chantier) => view.withClosed || !isClosed(chantier)),
    closedCount: all.filter(isClosed).length,
  }
}
